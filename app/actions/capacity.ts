"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getNow } from "@/lib/date-utils";
import { fetchTempo } from "@/lib/tempo";

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

    // Carga por miembro
    const workloadByMember = await Promise.all(members.map(async (member: any) => {
        // 1. Obtener tickets activos asignados en Jira (desde nuestra DB)
        // Asumimos que tickets con status no cerrados están activos
        const activeTickets = await prisma.ticket.findMany({
            where: {
                assignee: member.name,
                status: {
                    notIn: ['Cerrado', 'Resuelto', 'Closed', 'Resolved', 'Finalizado', 'Done']
                }
            }
        });

        // Estimación media por ticket si no tiene originalEstimate
        const DEFAULT_ESTIMATE = 4.0; // Horas

        const memberWeeks = weeks.map((week: { start: Date, end: Date }) => {
            // 1.1 Carga de Tickets
            // Para simplificar, dividimos la estimación del ticket entre las semanas si tiene due date,
            // o lo cargamos en la actual si no tiene.
            let ticketHours = 0;
            activeTickets.forEach((t: any) => {
                const estimate = (t.originalEstimate as number) || DEFAULT_ESTIMATE;
                const dueDate = t.dueDate ? new Date(t.dueDate) : null;

                if (!dueDate || dueDate <= week.end) {
                    // Si vence en esta semana o antes y es la semana actual (o no tiene fecha)
                    // cargamos el esfuerzo. En una implementación más compleja prorratearíamos.
                    if (week.start === weeks[0].start) {
                        ticketHours += estimate;
                    }
                }
            });

            // 1.2 Carga de Asignaciones Manuales (Prorrateo por días en la semana)
            let assignmentHours = 0;
            member.assignments.forEach((asig: any) => {
                const asigStart = new Date(asig.startDate);
                const asigEnd = new Date(asig.endDate);

                // Solapamiento de la asignación con la semana
                const overlapStart = new Date(Math.max(asigStart.getTime(), week.start.getTime()));
                const overlapEnd = new Date(Math.min(asigEnd.getTime(), week.end.getTime()));

                if (overlapStart < overlapEnd) {
                    const overlapDays = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 3600 * 24);
                    const totalDays = Math.max(1, (asigEnd.getTime() - asigStart.getTime()) / (1000 * 3600 * 24));
                    assignmentHours += (asig.hours / totalDays) * overlapDays;
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
                utilization
            };
        });

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
                // Tempo v4 member structure: tm.member.displayName or tm.member.name or tm.member.self
                const memberName = tm.member?.displayName || tm.member?.name;

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
                            isActive: true
                        },
                        create: {
                            name: memberName,
                            weeklyCapacity: 40.0, // Default
                            teamId: team.id,
                            isActive: true
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
