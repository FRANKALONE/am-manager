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
    const teams = await (prisma as any).team.findMany({
        where: { name: { startsWith: 'AMA' } }
    });
    const teamIds = teams.map((t: any) => t.id);

    const members = await (prisma as any).teamMember.findMany({
        where: { teamId: { in: teamIds }, isActive: true },
        include: { assignments: true }
    });

    const now = getNow();
    const currentMonday = new Date(now);
    const day = currentMonday.getDay();
    const diff = currentMonday.getDate() - day + (day === 0 ? -6 : 1);
    currentMonday.setDate(diff);
    currentMonday.setHours(0, 0, 0, 0);

    const numWeeks = 12; // Extendemos horizonte
    const weeks: { start: Date; end: Date }[] = [];
    for (let i = 0; i < numWeeks; i++) {
        const start = new Date(currentMonday);
        start.setDate(start.getDate() + (i * 7));
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        weeks.push({ start, end });
    }

    const wpAveragesCache = new Map<string, number>();

    const workloadByMember = await Promise.all(members.map(async (member: any) => {
        const memberWeeks = weeks.map(w => ({
            start: w.start,
            end: w.end,
            availableCapacity: member.weeklyCapacity || 40.0,
            ticketHours: 0,
            assignmentHours: 0,
            details: { tickets: [] as any[], assignments: [] as any[] }
        }));

        // 1. Asignaciones Manuales (Carga basada en fechas exactas)
        for (const asig of member.assignments) {
            const asigStart = new Date(asig.startDate);
            const asigEnd = new Date(asig.endDate);
            asigEnd.setHours(23, 59, 59, 999);

            // Duración total en días (inclusive)
            const totalDays = Math.max(1, Math.round((asigEnd.getTime() - asigStart.getTime()) / (1000 * 3600 * 24)));
            const hoursPerDay = asig.hours / totalDays;

            for (const week of memberWeeks) {
                // Intersección entre la semana y la asignación
                const overlapStart = new Date(Math.max(week.start.getTime(), asigStart.getTime()));
                const overlapEnd = new Date(Math.min(week.end.getTime(), asigEnd.getTime()));

                if (overlapStart < overlapEnd) {
                    const overlapDays = Math.max(1, Math.round((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 3600 * 24)));
                    const hoursToConsume = Math.min(week.availableCapacity, hoursPerDay * overlapDays);

                    if (hoursToConsume > 0) {
                        week.assignmentHours += hoursToConsume;
                        week.availableCapacity -= hoursToConsume;
                        week.details.assignments.push({
                            description: asig.description,
                            hours: hoursToConsume
                        });
                    }
                }
            }
        }

        // 2. Tickets Activos de DB
        const activeTicketsDb = await (prisma as any).ticket.findMany({
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

        // 3. Obtener datos precisos de Jira y detectar soporte DES
        const ticketDetails = await Promise.all(activeTicketsDb.map(async (t: any) => {
            let hours = 0;
            let priorityValue = 2; // Medium
            let summary = t.issueSummary;
            let dueDate = t.dueDate;
            let needsDESSupport = false;
            let techResponsibleId = null;

            try {
                // Fetch fields including customfield_10054 (Responsable Técnico)
                const jiraData = await fetchJira(`/issue/${t.issueKey}?fields=timetracking,issuetype,summary,priority,duedate,customfield_10054`);
                const tracking = jiraData?.fields?.timetracking;
                const rem = tracking?.remainingEstimateSeconds || 0;
                const spent = tracking?.timeSpentSeconds || 0;
                const orig = tracking?.originalEstimateSeconds || 0;

                if (rem > 0) hours = rem / 3600;
                else if (orig > 0) hours = Math.max(0, (orig - spent) / 3600);

                if (hours === 0) {
                    const isEvo = t.issueKey.startsWith('EVO-') || jiraData?.fields?.issuetype?.name === 'Evolutivo';
                    if (isEvo) hours = 8.0;
                    else {
                        if (!wpAveragesCache.has(t.workPackageId)) {
                            wpAveragesCache.set(t.workPackageId, await getClientAverageDedication(t.workPackageId));
                        }
                        hours = wpAveragesCache.get(t.workPackageId) || 4.0;
                    }
                }

                if (jiraData?.fields?.priority?.name === 'Highest' || jiraData?.fields?.priority?.name === 'High') priorityValue = 1;
                summary = jiraData?.fields?.summary || summary;
                dueDate = jiraData?.fields?.duedate ? new Date(jiraData?.fields?.duedate) : dueDate;

                // Get technical responsible
                const techResp = jiraData?.fields?.customfield_10054;
                techResponsibleId = techResp?.accountId;

                // Solo dividir carga si HAY un responsable técnico asignado
                if (techResponsibleId) {
                    needsDESSupport = true;
                }
            } catch (e) {
                console.error(`Error fetching Jira for ${t.issueKey}:`, e);
                hours = t.originalEstimate || 4.0;
            }

            // Detectar si este ticket necesita soporte DES
            // Si el assignee es de AMA-FI o AMA-LO Y tiene responsable técnico, dividir la carga
            const assigneeMember = members.find((m: any) => m.name === member.name);
            const assigneeTeam = (assigneeMember as any)?.team?.name;
            const isConsultantTeam = assigneeTeam === 'AMA-FI' || assigneeTeam === 'AMA-LO';

            let assigneeHours = hours;
            let desSupportHours = 0;

            if (needsDESSupport && isConsultantTeam && hours > 0) {
                // Ratio 70% assignee / 30% DES
                assigneeHours = hours * 0.70;
                desSupportHours = hours * 0.30;
            }

            return {
                key: t.issueKey,
                summary,
                hours: assigneeHours,
                desSupportHours,
                totalHours: hours,
                dueDate,
                priority: priorityValue,
                needsDESSupport,
                techResponsibleId,
                assignedTo: member.name
            };
        }));

        // Ordenar: Prioridad 1 primero, luego por DueDate
        ticketDetails.sort((a, b) => {
            if (a.priority !== b.priority) return a.priority - b.priority;
            if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime();
            if (a.dueDate) return -1;
            if (b.dueDate) return 1;
            return 0;
        });

        // 4. Reparto Secuencial (Consecutivo)
        for (const ticket of ticketDetails) {
            let remaining = ticket.hours;
            for (const week of memberWeeks) {
                if (remaining <= 0) break;
                if (week.availableCapacity <= 0) continue;

                const consume = Math.min(week.availableCapacity, remaining);
                week.ticketHours += consume;
                week.availableCapacity -= consume;
                remaining -= consume;

                week.details.tickets.push({
                    key: ticket.key,
                    summary: ticket.summary,
                    hours: consume,
                    isTotal: remaining === 0,
                    totalTicketHours: ticket.hours
                });
            }
        }

        return {
            id: member.id,
            name: member.name,
            capacity: member.weeklyCapacity || 40.0,
            weeks: memberWeeks.map(mw => {
                const totalLoad = mw.ticketHours + mw.assignmentHours;
                return {
                    start: mw.start,
                    end: mw.end,
                    ticketHours: mw.ticketHours,
                    assignmentHours: mw.assignmentHours,
                    totalLoad,
                    utilization: Math.round((totalLoad / (member.weeklyCapacity || 40)) * 100),
                    details: mw.details
                };
            })
        };
    }));

    // SEGUNDA PASADA: Asignar carga de soporte DES
    const desSupportTicketsToAssign: { key: string; summary: string; hours: number; priority: number; dueDate: Date | null; assignedTo: string; techResponsibleId: string }[] = [];

    for (const memberRes of workloadByMember) {
        const memberData = members.find((m: any) => m.id === memberRes.id);
        if (!memberData) continue;

        const assigneeTeam = memberData.team?.name;
        if (assigneeTeam === 'AMA-FI' || assigneeTeam === 'AMA-LO') {
            // Buscar tickets activos de este miembro
            const memberTickets = await (prisma as any).ticket.findMany({
                where: {
                    assignee: memberData.name,
                    status: {
                        notIn: [
                            'Cerrado', 'Resuelto', 'Closed', 'Resolved', 'Finalizado', 'Done',
                            'Propuesta de solución', 'Entregado en PRO', 'Enviado a Gerente', 'Enviado a Cliente'
                        ]
                    }
                }
            });

            for (const ticket of memberTickets) {
                try {
                    const jiraData = await fetchJira(`/issue/${ticket.issueKey}?fields=timetracking,summary,priority,duedate,customfield_10054`);
                    const techResp = jiraData?.fields?.customfield_10054;
                    const tracking = jiraData?.fields?.timetracking;
                    let hours = 0;

                    const rem = tracking?.remainingEstimateSeconds || 0;
                    const spent = tracking?.timeSpentSeconds || 0;
                    const orig = tracking?.originalEstimateSeconds || 0;

                    if (rem > 0) hours = rem / 3600;
                    else if (orig > 0) hours = Math.max(0, (orig - spent) / 3600);
                    if (hours === 0) hours = ticket.originalEstimate || 4.0;

                    const desSupportHours = hours * 0.30;

                    if (desSupportHours > 0) {
                        const priorityName = jiraData?.fields?.priority?.name || 'Medium';
                        let priorityValue = 2;
                        if (priorityName === 'Highest' || priorityName === 'High') priorityValue = 1;

                        desSupportTicketsToAssign.push({
                            key: ticket.issueKey,
                            summary: jiraData?.fields?.summary || ticket.issueSummary,
                            hours: desSupportHours,
                            dueDate: jiraData?.fields?.duedate ? new Date(jiraData?.fields?.duedate) : ticket.dueDate,
                            priority: priorityValue,
                            assignedTo: memberData.name,
                            techResponsibleId: techResp.accountId
                        });
                    }
                } catch (e) {
                    // Silently skip if can't fetch
                }
            }
        }
    }

    // Ordenar tickets DES por prioridad
    desSupportTicketsToAssign.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime();
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return 0;
    });

    // Asignar cada ticket al responsable técnico correspondiente
    if (desSupportTicketsToAssign.length > 0) {
        for (const desTicket of desSupportTicketsToAssign) {
            // Buscar al miembro cuyo linkedUserId coincida con techResponsibleId
            const targetMember = workloadByMember.find(m => {
                const md = members.find((mem: any) => mem.id === m.id);
                return md?.linkedUserId === desTicket.techResponsibleId;
            });

            if (targetMember) {
                let remaining = desTicket.hours;
                for (const week of targetMember.weeks as any[]) {
                    if (remaining <= 0) break;
                    const availableCap = (targetMember.capacity || 40) - week.totalLoad;
                    if (availableCap <= 0) continue;

                    const consume = Math.min(availableCap, remaining);
                    week.ticketHours += consume;
                    week.totalLoad += consume;
                    remaining -= consume;

                    week.details.tickets.push({
                        key: `${desTicket.key} (Soporte)`,
                        summary: `[Soporte a ${desTicket.assignedTo}] ${desTicket.summary}`,
                        hours: consume,
                        isDESSupport: true,
                        totalTicketHours: desTicket.hours
                    });
                }

                // Recalcular utilización para el miembro destino
                for (const week of (targetMember.weeks as any[])) {
                    week.utilization = Math.round((week.totalLoad / targetMember.capacity) * 100);
                }
            }
        }
    }

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

        // Fetch Workload Schemes to get actual capacities
        const capacityMap = new Map<string, number>();
        try {
            const schemesRes = await fetchTempo("/workload-schemes");
            for (const scheme of (schemesRes.results || [])) {
                const weeklySeconds = scheme.days.reduce((sum: number, d: any) => sum + (d.requiredSeconds || 0), 0);
                const weeklyHours = weeklySeconds / 3600;

                const membersRes = await fetchTempo(`/workload-schemes/${scheme.id}/members`);
                for (const m of (membersRes.results || [])) {
                    capacityMap.set(m.accountId, weeklyHours);
                }
            }
        } catch (err) {
            console.error("Error fetching workload schemes:", err);
        }

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
                    const memberCapacity = capacityMap.get(accountId) || 40.0;
                    if (memberName.includes("Victoria Aranda")) {
                        console.log(`[DEBUG] Victoria Aranda accountId: ${accountId}, capacity from map: ${capacityMap.get(accountId)}, final: ${memberCapacity}`);
                    }
                    await (prisma as any).teamMember.upsert({
                        where: { name: memberName },
                        update: {
                            teamId: team.id,
                            isActive: true,
                            linkedUserId: accountId,
                            weeklyCapacity: memberCapacity
                        },
                        create: {
                            name: memberName,
                            weeklyCapacity: memberCapacity,
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
