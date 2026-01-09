"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createLanding(data: {
    slug: string;
    title: string;
    content: string;
    allowedRoles: string;
    allowedClients?: string;
    activeFrom?: Date;
    activeUntil?: Date;
    showInHeader?: boolean;
    priority?: number;
    createdBy: string;
}) {
    try {
        // Check if slug already exists
        const existing = await prisma.temporaryLanding.findUnique({
            where: { slug: data.slug }
        });

        if (existing) {
            return { success: false, error: "Ya existe una landing con este slug" };
        }

        const landing = await prisma.temporaryLanding.create({
            data: {
                slug: data.slug,
                title: data.title,
                content: data.content,
                allowedRoles: data.allowedRoles,
                allowedClients: data.allowedClients,
                activeFrom: data.activeFrom || new Date(),
                activeUntil: data.activeUntil,
                showInHeader: data.showInHeader || false,
                priority: data.priority || 0,
                createdBy: data.createdBy,
                isActive: true
            }
        });

        revalidatePath('/admin/landings');
        revalidatePath('/');
        return { success: true, id: landing.id };
    } catch (error) {
        console.error("Error creating landing:", error);
        return { success: false, error: "Error al crear la landing page" };
    }
}

export async function updateLanding(id: string, data: Partial<{
    slug: string;
    title: string;
    content: string;
    allowedRoles: string;
    allowedClients: string;
    activeFrom: Date;
    activeUntil: Date;
    showInHeader: boolean;
    priority: number;
    isActive: boolean;
}>) {
    try {
        await prisma.temporaryLanding.update({
            where: { id },
            data
        });

        revalidatePath('/admin/landings');
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error("Error updating landing:", error);
        return { success: false, error: "Error al actualizar la landing" };
    }
}

export async function deleteLanding(id: string) {
    try {
        await prisma.temporaryLanding.delete({
            where: { id }
        });

        revalidatePath('/admin/landings');
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error("Error deleting landing:", error);
        return { success: false, error: "Error al eliminar la landing" };
    }
}

export async function getLandings() {
    try {
        const landings = await prisma.temporaryLanding.findMany({
            include: {
                creator: {
                    select: {
                        name: true,
                        surname: true
                    }
                },
                views: {
                    select: {
                        id: true,
                        viewedAt: true
                    }
                }
            },
            orderBy: [
                { isActive: 'desc' },
                { priority: 'desc' },
                { createdAt: 'desc' }
            ]
        });

        return landings.map(landing => ({
            ...landing,
            viewCount: landing.views.length,
            uniqueViewers: landing.views.length // Could be improved with distinct user count
        }));
    } catch (error) {
        console.error("Error getting landings:", error);
        return [];
    }
}

export async function getActiveLandingsForUser(userId: string) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true, clientId: true }
        });

        if (!user) return [];

        const now = new Date();

        const landings = await prisma.temporaryLanding.findMany({
            where: {
                isActive: true,
                activeFrom: { lte: now },
                OR: [
                    { activeUntil: null },
                    { activeUntil: { gte: now } }
                ]
            },
            select: {
                id: true,
                slug: true,
                title: true,
                allowedRoles: true,
                allowedClients: true,
                showInHeader: true,
                priority: true,
                views: {
                    where: { userId },
                    select: { id: true }
                }
            },
            orderBy: { priority: 'desc' }
        });

        // Filter by access control
        const accessibleLandings = landings.filter(landing => {
            // Check role
            const allowedRoles = landing.allowedRoles.split(',').map(r => r.trim());
            if (!allowedRoles.includes(user.role)) return false;

            // Check client if specified
            if (landing.allowedClients) {
                const allowedClients = landing.allowedClients.split(',').map(c => c.trim());
                if (user.clientId && !allowedClients.includes(user.clientId)) return false;
            }

            return true;
        });

        return accessibleLandings.map(landing => ({
            id: landing.id,
            slug: landing.slug,
            title: landing.title,
            showInHeader: landing.showInHeader,
            priority: landing.priority,
            isNew: landing.views.length === 0
        }));
    } catch (error) {
        console.error("Error getting active landings for user:", error);
        return [];
    }
}

export async function getLandingBySlug(slug: string, userId: string) {
    try {
        const landing = await prisma.temporaryLanding.findUnique({
            where: { slug },
            include: {
                creator: {
                    select: {
                        name: true,
                        surname: true
                    }
                }
            }
        });

        if (!landing) return null;

        // Check if active
        const now = new Date();
        if (!landing.isActive ||
            landing.activeFrom > now ||
            (landing.activeUntil && landing.activeUntil < now)) {
            return null;
        }

        // Check access control
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true, clientId: true }
        });

        if (!user) return null;

        const allowedRoles = landing.allowedRoles.split(',').map(r => r.trim());
        if (!allowedRoles.includes(user.role)) return null;

        if (landing.allowedClients) {
            const allowedClients = landing.allowedClients.split(',').map(c => c.trim());
            if (user.clientId && !allowedClients.includes(user.clientId)) return null;
        }

        return landing;
    } catch (error) {
        console.error("Error getting landing by slug:", error);
        return null;
    }
}

export async function trackLandingView(landingId: string, userId: string) {
    try {
        // Check if already viewed
        const existingView = await prisma.landingView.findFirst({
            where: {
                landingId,
                userId
            }
        });

        if (!existingView) {
            await prisma.landingView.create({
                data: {
                    landingId,
                    userId
                }
            });
        }

        return { success: true };
    } catch (error) {
        console.error("Error tracking landing view:", error);
        return { success: false };
    }
}

export async function getLandingStats(id: string) {
    try {
        const landing = await prisma.temporaryLanding.findUnique({
            where: { id },
            include: {
                views: {
                    include: {
                        user: {
                            select: {
                                name: true,
                                surname: true,
                                email: true,
                                role: true
                            }
                        }
                    },
                    orderBy: {
                        viewedAt: 'desc'
                    }
                }
            }
        });

        if (!landing) return null;

        // Get unique viewers
        const uniqueViewers = new Set(landing.views.map(v => v.userId)).size;

        return {
            ...landing,
            stats: {
                totalViews: landing.views.length,
                uniqueViewers
            },
            recentViews: landing.views.slice(0, 50).map(v => ({
                user: v.user,
                viewedAt: v.viewedAt
            }))
        };
    } catch (error) {
        console.error("Error getting landing stats:", error);
        return null;
    }
}
