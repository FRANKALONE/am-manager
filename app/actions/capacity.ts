"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getNow } from "@/lib/date-utils";
import { fetchTempo } from "@/lib/tempo";
import { fetchJira } from "@/lib/jira";

/**
 * Helper para parsear strings de SLA de Jira (ej: "2h 30m") a horas decimales.
 */
function parseSlaToHours(slaStr: string | null): number {
    if (!slaStr) return 999; // Alta disponibilidad si no hay SLA

    // Si dice "En plazo" o similar, le damos un valor base alto
    if (slaStr.toLowerCase().includes("plazo")) return 48;

    let totalHours = 0;
    const hoursMatch = slaStr.match(/(\d+)h/);
    const minsMatch = slaStr.match(/(\d+)m/);

    if (hoursMatch) totalHours += parseInt(hoursMatch[1]);
    if (minsMatch) totalHours += parseInt(minsMatch[1]) / 60;

    return totalHours > 0 ? totalHours : 999;
}

/**
 * Calcula la dedicación media de tickets cerrados en los últimos 3 meses para un WP.
 */
async function getClientAverageDedication(wpId: string): Promise<number> {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const historicalLogs = await prisma.worklogDetail.findMany({
        where: {
            workPackageId: wpId,
            startDate: { gte: threeMonthsAgo },
            // Filtrar por tipos "normales" si quisiéramos ser más finos, 
            // pero el usuario pide media general para tickets que no son evolutivos.
            issueType: { notIn: ["Evolutivo", "Hitos Evolutivos"] }
        },
        select: { timeSpentHours: true, issueKey: true }
    });

    if (historicalLogs.length === 0) return 4.0; // Fallback

    // Agrupar por ticket para sacar la media por ticket, no por imputación
    const ticketTotals = new Map<string, number>();
    historicalLogs.forEach(log => {
        if (log.issueKey) {
            ticketTotals.set(log.issueKey, (ticketTotals.get(log.issueKey) || 0) + log.timeSpentHours);
        }
    });

    const values = Array.from(ticketTotals.values());
    const sum = values.reduce((a, b) => a + b, 0);
    return sum / (values.length || 1);
}

/**
 * Gestores del equipo (Team Members)
 */
export async function getTeamMembers() {
    return await prisma.teamMember.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        include: {
            team: true,
            assignments: {
                where: {
                    endDate: { gte: getNow() }
                }
            }
        }
    });
}

export async function getTeams() {
    return await prisma.team.findMany({
        orderBy: { name: 'asc' },
        include: {
            _count: {
                select: { members: true }
            }
        }
    });
}

export async function createTeamMember(data: { name: string, weeklyCapacity: number, teamId?: string, linkedUserId?: string }) {
    const member = await prisma.teamMember.create({
        data: {
            name: data.name,
            weeklyCapacity: data.weeklyCapacity || 40.0,
            teamId: data.teamId,
            linkedUserId: data.linkedUserId
        }
    });
    revalidatePath("/capacity");
    return member;
}

export async function updateTeamMember(id: string, data: any) {
    const member = await prisma.teamMember.update({
        where: { id },
        data
    });
    revalidatePath("/capacity");
    return member;
}

/**
 * Asignaciones (Assignments) - Trabajos fuera de Jira
 */
export async function createAssignment(data: {
    memberId: string,
    description: string,
    hours: number,
    startDate: Date,
    endDate: Date
}) {
    const assignment = await prisma.capacityAssignment.create({
        data: {
            memberId: data.memberId,
            description: data.description,
            hours: data.hours,
            startDate: data.startDate,
            endDate: data.endDate
        }
    });
    revalidatePath("/capacity");
    return assignment;
}

export async function deleteAssignment(id: string) {
    await prisma.capacityAssignment.delete({ where: { id } });
    revalidatePath("/capacity");
}

/**
 * Cálculo de Carga (Workload Calculation)
 * Calcula la carga para las próximas 4 semanas empezando desde el lunes actual
 */
export async function getTeamWorkload() {
    const members = await prisma.teamMember.findMany({
        where: { isActive: true },
        include: {
            assignments: {
                where: {
                    status: "ACTIVE",
                    endDate: { gte: getNow() }
                }
            }
        }
    });

    const now = getNow();
    const startOfCurrentWeek = new Date(now);
    const day = startOfCurrentWeek.getDay();
    const diff = startOfCurrentWeek.getDate() - day + (day === 0 ? -6 : 1); // Ajuste a Lunes
    startOfCurrentWeek.setDate(diff);
    startOfCurrentWeek.setHours(0, 0, 0, 0);

    // Semanas a calcular (4)
    const weeks: { start: Date, end: Date }[] = [];
    for (let i = 0; i < 4; i++) {
        const start = new Date(startOfCurrentWeek);
        start.setDate(start.getDate() + (i * 7));
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        weeks.push({ start, end });
    }

    // Cache de medias por WP para no repetir consultas
    const wpAveragesCache = new Map<string, number>();

    // Carga por miembro
    const workloadByMember = await Promise.all(members.map(async (member: any) => {
        // 1. Obtener tickets activos asignados en Jira (desde nuestra DB)
        // Refinamos el filtro de estados "vivos"
        const activeTicketsDb = await prisma.ticket.findMany({
            where: {
                assignee: member.name,
                status: {
                    notIn: [
                        'Cerrado', 'Resuelto', 'Closed', 'Resolved', 'Finalizado', 'Done',
                        'Propuesta de solución', 'Entregado en PRO', 'Enviado a Gerente', 'Enviado a Cliente'
                    ]
                }
            }
        });

        if (activeTicketsDb.length === 0 && member.assignments.length === 0) {
            return {
                id: member.id,
                name: member.name,
                capacity: member.weeklyCapacity,
                weeks: weeks.map(w => ({
                    weekStart: w.start,
                    ticketHours: 0,
                    assignmentHours: 0,
                    totalLoad: 0,
                    utilization: 0
                }))
            };
        }

        // 2. Fetch de Remaining Estimates y vinculación de Hitos
        let ticketDetails = new Map<string, { remainingSeconds: number, timeSpentSeconds: number }>();
        let parentHitos = new Map<string, Date>(); // issueKey -> nearest Hito dueDate

        try {
            const issueKeys = activeTicketsDb.map(t => t.issueKey);
            const parentKeys = activeTicketsDb.filter(t => t.parentKey).map(t => t.parentKey as string);

            if (issueKeys.length > 0) {
                // 2.1 Jira Timetracking
                const jql = `key IN (${issueKeys.map(k => `"${k}"`).join(',')})`;
                const jiraRes = await fetchJira(`/search`, {
                    method: "POST",
                    body: JSON.stringify({
                        jql,
                        fields: ["timetracking"],
                        maxResults: 100
                    })
                });

                (jiraRes.issues || []).forEach((issue: any) => {
                    ticketDetails.set(issue.key, {
                        remainingSeconds: issue.fields.timetracking?.remainingEstimateSeconds || 0,
                        timeSpentSeconds: issue.fields.timetracking?.timeSpentSeconds || 0
                    });
                });

                // 2.2 Buscar hitos cercanos para los evolutivos activos
                const evolutivoKeys = activeTicketsDb.filter(t => t.issueType === 'Evolutivo').map(t => t.issueKey);
                if (evolutivoKeys.length > 0) {
                    const hitos = await prisma.ticket.findMany({
                        where: {
                            parentKey: { in: evolutivoKeys },
                            issueType: 'Hitos Evolutivos',
                            dueDate: { not: null },
                            status: { notIn: ['Cerrado', 'Propuesta de solución', 'Entregado en PRO', 'Enviado a Gerente', 'Enviado a Cliente'] }
                        },
                        orderBy: { dueDate: 'asc' }
                    });

                    hitos.forEach(h => {
                        if (h.parentKey && !parentHitos.has(h.parentKey)) {
                            parentHitos.set(h.parentKey, h.dueDate as Date);
                        }
                    });
                }
            }
        } catch (e) {
            console.error("Error fetching runtime details:", e);
        }

        const memberWeeks = await Promise.all(weeks.map(async (week: { start: Date, end: Date }, weekIdx: number) => {
            let ticketHours = 0;
            const details: { tickets: any[], assignments: any[] } = { tickets: [], assignments: [] };

            for (const t of activeTicketsDb) {
                let estimate = 0;

                if (t.issueType === 'Evolutivo') {
                    const d = ticketDetails.get(t.issueKey);
                    if (d && d.remainingSeconds > 0) {
                        estimate = d.remainingSeconds / 3600;
                    } else {
                        const spent = d?.timeSpentSeconds ? (d.timeSpentSeconds / 3600) : 0;
                        estimate = Math.max(0, (t.originalEstimate || 0) - spent);
                    }

                    if (estimate === 0 && (t.billingMode?.includes("T&M"))) estimate = 8.0;
                } else if (t.issueType === 'Hitos Evolutivos') {
                    estimate = t.originalEstimate || 2.0;
                } else {
                    if (!wpAveragesCache.has(t.workPackageId)) {
                        const avg = await getClientAverageDedication(t.workPackageId);
                        wpAveragesCache.set(t.workPackageId, avg);
                    }
                    estimate = wpAveragesCache.get(t.workPackageId) || 4.0;
                }

                // Fecha de referencia para prioridad: su propia dueDate o el hito más cercano
                const dueDate = t.dueDate ? new Date(t.dueDate) : (parentHitos.get(t.issueKey) || null);
                const slaUrgency = parseSlaToHours(t.slaResolutionTime || t.slaResolution);

                // Prioridad absoluta: SLA muy corto o Hito vencido/esta semana
                const isUrgent = slaUrgency < 24 || (dueDate && dueDate <= weeks[0].end);

                let assignedHours = 0;
                if (isUrgent) {
                    if (weekIdx === 0) assignedHours = estimate;
                } else if (dueDate && dueDate <= week.end) {
                    // Distribuimos la carga hasta el hito/vencimiento
                    const daysToDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
                    const weeksToDue = Math.ceil(daysToDue / 7);

                    if (weekIdx < weeksToDue) {
                        assignedHours = estimate / weeksToDue;
                    }
                } else if (!dueDate) {
                    // Si no tiene fecha, lo cargamos en las primeras 2 semanas para que no "desaparezca"
                    if (weekIdx < 2) assignedHours = estimate / 2;
                }

                if (assignedHours > 0) {
                    ticketHours += assignedHours;
                    details.tickets.push({
                        key: t.issueKey,
                        summary: t.issueSummary,
                        type: t.issueType,
                        hours: assignedHours,
                        dueDate: dueDate,
                        isUrgent
                    });
                }
            }

            // 1.2 Carga de Asignaciones Manuales (Prorrateo por días en la semana)
            let assignmentHours = 0;
            member.assignments.forEach((asig: any) => {
                const asigStart = new Date(asig.startDate);
                const asigEnd = new Date(asig.endDate);

                const overlapStart = new Date(Math.max(asigStart.getTime(), week.start.getTime()));
                const overlapEnd = new Date(Math.min(asigEnd.getTime(), week.end.getTime()));

                if (overlapStart < overlapEnd) {
                    const overlapDays = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 3600 * 24);
                    const totalDays = Math.max(1, (asigEnd.getTime() - asigStart.getTime()) / (1000 * 3600 * 24));
                    const currentHours = (asig.hours / totalDays) * overlapDays;
                    assignmentHours += currentHours;
                    details.assignments.push({
                        description: asig.description,
                        hours: currentHours
                    });
                }
            });

            const totalLoad = ticketHours + assignmentHours;
            const capacity = member.weeklyCapacity;
            const utilization = capacity > 0 ? (totalLoad / capacity) * 100 : 0;

            return {
                weekStart: week.start,
                ticketHours,
                assignmentHours,
                totalLoad,
                utilization,
                details
            };
        }));

        return {
            id: member.id,
            name: member.name,
            capacity: member.weeklyCapacity,
            weeks: memberWeeks
        };
    }));

    return {
        weeks: weeks.map(w => ({ start: w.start, end: w.end })),
        members: workloadByMember
    };
}

/**
 * Previsión basada en histórico (Forecasting)
 */
export async function getLoadForecast() {
    const now = getNow();
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    // Tickets creados en los últimos 3 meses
    const historicalTickets = await prisma.ticket.findMany({
        where: {
            createdDate: { gte: threeMonthsAgo }
        }
    });

    // Agrupar por semana histórica para sacar la media
    const weeksCount = 12; // aprox 3 meses
    const avgTicketsPerWeek = historicalTickets.length / weeksCount;
    const avgHoursPerTicket = historicalTickets.reduce((sum, t) => sum + (t.originalEstimate || 4), 0) / (historicalTickets.length || 1);

    return {
        avgTicketsPerWeek,
        avgHoursPerTicket,
        predictedWeeklyHours: avgTicketsPerWeek * avgHoursPerTicket
    };
}

/**
 * Sincronización con Tempo Teams
 */
export async function syncTeamsFromTempo() {
    try {
        console.log("Starting Tempo Teams sync...");
        const teamsResponse = await fetchTempo("/teams");
        const tempoTeams = teamsResponse.results || [];

        // Jira Credentials
        const jiraUrl = process.env.JIRA_URL?.trim();
        const jiraEmail = process.env.JIRA_USER_EMAIL?.trim();
        const jiraToken = process.env.JIRA_API_TOKEN?.trim();
        const auth = (jiraEmail && jiraToken) ? Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64') : null;

        // Cache to avoid redundant Jira calls
        const userNamesCache = new Map<string, string>();

        for (const t of tempoTeams) {
            // Upsert Team
            const team = await prisma.team.upsert({
                where: { jiraId: t.id.toString() },
                update: { name: t.name },
                create: {
                    jiraId: t.id.toString(),
                    name: t.name
                }
            });

            // Fetch Members for this team
            const membersResponse = await fetchTempo(`/teams/${t.id}/members`);
            const tempoMembers = membersResponse.results || [];

            for (const tm of tempoMembers) {
                // Filter: Only currently active members in the team
                if (!tm.memberships?.active) {
                    continue;
                }

                const accountId = tm.member?.accountId;
                let memberName = tm.member?.displayName;

                // If displayName is missing, try to fetch from Jira
                if (!memberName && accountId && auth && jiraUrl) {
                    if (userNamesCache.has(accountId)) {
                        memberName = userNamesCache.get(accountId);
                    } else {
                        try {
                            const jiraRes = await fetch(`${jiraUrl}/rest/api/3/user?accountId=${accountId}`, {
                                headers: {
                                    'Authorization': `Basic ${auth}`,
                                    'Accept': 'application/json'
                                }
                            });
                            if (jiraRes.ok) {
                                const jiraUser = await jiraRes.json();
                                memberName = jiraUser.displayName;
                                if (memberName) userNamesCache.set(accountId, memberName);
                            }
                        } catch (err) {
                            console.error(`Error fetching Jira user ${accountId}:`, err);
                        }
                    }
                }

                if (!memberName) {
                    console.warn(`[SYNC] Skipping team member without name for team ${team.name}:`, JSON.stringify(tm));
                    continue;
                }

                // Upsert Member
                try {
                    await prisma.teamMember.upsert({
                        where: { name: memberName },
                        update: {
                            teamId: team.id,
                            isActive: true,
                            linkedUserId: accountId // Store accountId for future reference
                        },
                        create: {
                            name: memberName,
                            weeklyCapacity: 40.0, // Default
                            teamId: team.id,
                            isActive: true,
                            linkedUserId: accountId
                        }
                    });
                } catch (dbError) {
                    console.error(`[SYNC] Error upserting member ${memberName}:`, dbError);
                }
            }
        }

        revalidatePath("/capacity");
        return { success: true, count: tempoTeams.length };
    } catch (error) {
        console.error("Error syncing Tempo teams:", error);
        return { success: false, error: String(error) };
    }
}
