"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { getTranslations } from "@/lib/get-translations";
import { getVisibilityFilter, getHomeUrl, getCurrentUser, hasPermission, encrypt } from "@/lib/auth";

export interface UserFilters {
    email?: string;
    role?: string;
    clientId?: string;
    lastLoginFrom?: string;
    lastLoginTo?: string;
}

export async function getUsers(filters?: UserFilters) {
    try {
        const authFilter = await getVisibilityFilter();
        const where: any = {};

        if (!authFilter.isGlobal) {
            if (authFilter.clientIds && authFilter.clientIds.length > 0) {
                where.clientId = { in: authFilter.clientIds };
            } else if (authFilter.managerId) {
                where.client = { manager: authFilter.managerId };
            } else {
                return [];
            }
        }

        if (filters?.email) {
            where.email = { contains: filters.email, mode: 'insensitive' };
        }
        if (filters?.role && filters.role !== 'ALL') {
            where.role = filters.role;
        }
        if (filters?.clientId && filters.clientId !== 'ALL') {
            where.clientId = filters.clientId;
        }
        if (filters?.lastLoginFrom || filters?.lastLoginTo) {
            where.lastLoginAt = {};
            if (filters.lastLoginFrom) {
                where.lastLoginAt.gte = new Date(filters.lastLoginFrom);
            }
            if (filters.lastLoginTo) {
                const toDate = new Date(filters.lastLoginTo);
                toDate.setHours(23, 59, 59, 999);
                where.lastLoginAt.lte = toDate;
            }
        }

        const users = await prisma.user.findMany({
            where,
            include: {
                linkedEvolUser: true,
                client: {
                    include: {
                        workPackages: {
                            include: {
                                validityPeriods: {
                                    where: {
                                        startDate: { lte: new Date() },
                                        endDate: { gte: new Date() }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Get all roles to check isPremium flag
        const roles = await prisma.role.findMany();
        const roleMap = new Map(roles.map(r => [r.name, r]));

        // Calculate isPremium for each user
        const usersWithPremium = users.map(user => {
            let isPremium = false;

            // First, check if the user's role itself is marked as premium
            const userRole = roleMap.get(user.role);
            if (userRole?.isPremium === 1) {
                isPremium = true;
            }
            // If role is not premium, check if any current validity period is premium
            else if (user.client && user.client.workPackages) {
                isPremium = user.client.workPackages.some(wp =>
                    wp.validityPeriods.some(vp => vp.isPremium === true)
                );
            }

            return {
                ...user,
                isPremium
            };
        });

        return usersWithPremium;
    } catch (error) {
        console.error("Failed to fetch users:", error);
        return [];
    }
}

export async function getEligibleManagers() {
    try {
        // Find roles that should be treated as managers (have view_manager_dashboard permission)
        const roles = await prisma.role.findMany({
            where: { isActive: true }
        });

        const managerRoleNames = roles
            .filter(role => {
                try {
                    const perms = JSON.parse(role.permissions);
                    return perms.view_manager_dashboard === true || role.name === 'ADMIN';
                } catch (e) {
                    return false;
                }
            })
            .map(role => role.name);

        const users = await prisma.user.findMany({
            where: {
                role: { in: managerRoleNames }
            },
            orderBy: { name: 'asc' }
        });
        return users;
    } catch (error) {
        console.error("Error fetching eligible managers:", error);
        return [];
    }
}

export async function getUserById(id: string) {
    try {
        return await prisma.user.findUnique({
            where: { id },
            include: {
                client: true,
                linkedEvolUser: true
            }
        });
    } catch (error) {
        return null;
    }
}

export async function getMe() {
    return await getCurrentUser();
}

export async function createUser(prevState: any, formData: FormData) {
    if (!await hasPermission('manage_users')) {
        return { error: "No autorizado" };
    }

    const name = formData.get("name") as string;
    const surname = formData.get("surname") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const role = formData.get("role") as string;
    const clientId = formData.get("clientId") as string;
    const workPackageIds = formData.get("workPackageIds") as string; // JSON string
    const jiraGestorName = formData.get("jiraGestorName") as string;

    const { t } = await getTranslations();
    if (!name) return { error: t('errors.required', { field: t('common.name') }) };
    if (!email) return { error: t('errors.required', { field: t('auth.email') }) };
    if (!password) return { error: t('errors.required', { field: t('auth.password') }) };
    if (!role) return { error: t('errors.required', { field: t('user.role') }) };

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await prisma.user.create({
            data: {
                name,
                surname: surname || null,
                email,
                password: hashedPassword,
                role,
                clientId: clientId || null,
                workPackageIds: workPackageIds || null
            }
        });

        if (jiraGestorName) {
            await prisma.eVOLEvolutivoUser.create({
                data: {
                    email,
                    password: hashedPassword,
                    name: `${name} ${surname || ''}`.trim(),
                    jiraGestorName,
                    linkedUserId: newUser.id
                }
            });
        }
    } catch (error: any) {
        console.error(error);
        const { t } = await getTranslations();
        if (error.code === 'P2002') {
            return { error: t('errors.alreadyExists', { item: t('auth.email') }) };
        }
        return { error: t('errors.createError', { item: t('user.profile') }) };
    }

    revalidatePath("/admin/users");
    redirect("/admin/users");
}

export async function updateUser(id: string, prevState: any, formData: FormData) {
    if (!await hasPermission('manage_users')) {
        return { error: "No autorizado" };
    }

    const name = formData.get("name") as string;
    const surname = formData.get("surname") as string;
    const email = formData.get("email") as string;
    const role = formData.get("role") as string;
    const clientId = formData.get("clientId") as string;
    const workPackageIds = formData.get("workPackageIds") as string;
    const jiraGestorName = formData.get("jiraGestorName") as string;

    const { t } = await getTranslations();
    if (!name) return { error: t('errors.required', { field: t('common.name') }) };
    if (!email) return { error: t('errors.required', { field: t('auth.email') }) };
    if (!role) return { error: t('errors.required', { field: t('user.role') }) };

    try {
        const user = await prisma.user.update({
            where: { id },
            data: {
                name,
                surname: surname || null,
                email,
                role,
                clientId: clientId || null,
                workPackageIds: workPackageIds || null
            },
            include: { linkedEvolUser: true }
        });

        if (jiraGestorName) {
            if (user.linkedEvolUser) {
                await prisma.eVOLEvolutivoUser.update({
                    where: { id: user.linkedEvolUser.id },
                    data: { jiraGestorName, name: `${name} ${surname || ''}`.trim(), email }
                });
            } else {
                await prisma.eVOLEvolutivoUser.create({
                    data: {
                        email,
                        password: user.password,
                        name: `${name} ${surname || ''}`.trim(),
                        jiraGestorName,
                        linkedUserId: user.id
                    }
                });
            }
        } else if (user.linkedEvolUser) {
            await prisma.eVOLEvolutivoUser.update({
                where: { id: user.linkedEvolUser.id },
                data: { jiraGestorName: null }
            });
        }
    } catch (error: any) {
        console.error(error);
        const { t } = await getTranslations();
        if (error.code === 'P2002') {
            return { error: t('errors.alreadyExists', { item: t('auth.email') }) };
        }
        return { error: t('errors.updateError', { item: t('user.profile') }) };
    }

    revalidatePath("/admin/users");
    redirect("/admin/users");
}

export async function deleteUser(id: string) {
    if (!await hasPermission('manage_users')) {
        return { success: false, error: "No autorizado" };
    }

    try {
        await prisma.user.delete({ where: { id } });
        revalidatePath("/admin/users");
        return { success: true };
    } catch (error) {
        const { t } = await getTranslations();
        return { success: false, error: t('errors.deleteError', { item: t('user.profile') }) };
    }
}

export async function resetUserPassword(id: string, newPassword: string) {
    if (!await hasPermission('manage_users')) {
        return { success: false, error: "No autorizado" };
    }

    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id },
            data: {
                password: hashedPassword,
                mustChangePassword: true
            }
        });
        revalidatePath("/admin/users");
        return { success: true };
    } catch (error) {
        const { t } = await getTranslations();
        return { success: false, error: t('errors.updateError', { item: t('auth.password') }) };
    }
}

export async function authenticate(prevState: any, formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { t } = await getTranslations();

    if (!email || !password) {
        return { error: t('errors.required', { field: t('auth.email') + ' & ' + t('auth.password') }) };
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            return { error: "Credenciales inválidas" };
        }

        // Check password
        let isPasswordCorrect = await bcrypt.compare(password, user.password);

        if (!isPasswordCorrect && password === user.password) {
            // Migration: If it matched as plain text, migrate it to hashed and allow login
            const hashedPassword = await bcrypt.hash(password, 10);
            await prisma.user.update({
                where: { id: user.id },
                data: { password: hashedPassword }
            });
            isPasswordCorrect = true;
        }

        if (!isPasswordCorrect) {
            return { error: "Credenciales inválidas" };
        }

        // Create session payload
        const sessionPayload = {
            userId: user.id,
            userRole: user.role,
            userEmail: user.email,
            clientId: user.clientId || undefined
        };

        const sessionToken = await encrypt(sessionPayload);

        // Set JWT session cookie
        cookies().set("session", sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24, // 1 day
            path: "/",
        });

        // Update legacy cookies for transition (keep them for now)
        cookies().set("user_id", user.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 60 * 60 * 24, // 1 day
            path: "/",
        });

        cookies().set("user_email", user.email, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 60 * 60 * 24, // 1 day
            path: "/",
        });

        cookies().set("user_role", user.role, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 60 * 60 * 24, // 1 day
            path: "/",
        });

        // Set client_id cookie if user has a client
        if (user.clientId) {
            cookies().set("client_id", user.clientId, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                maxAge: 60 * 60 * 24, // 1 day
                path: "/",
            });
        }

        // Sync preferences: Prioritize the language selected on the login page (via NEXT_LOCALE cookie)
        const currentLocaleCookie = cookies().get("NEXT_LOCALE")?.value;
        let finalLocale = user.locale;

        if (currentLocaleCookie && ['es', 'en', 'pt', 'it', 'fr', 'hi'].includes(currentLocaleCookie)) {
            finalLocale = currentLocaleCookie;
            // Update the user's preference in the DB if it changed
            if (user.locale !== currentLocaleCookie) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { locale: currentLocaleCookie }
                });
            }
        }

        if (finalLocale) {
            cookies().set("NEXT_LOCALE", finalLocale, {
                maxAge: 365 * 24 * 60 * 60, // 1 year
                path: "/",
            });
        }

        if (user.timezone) {
            cookies().set("NEXT_TIMEZONE", user.timezone, {
                maxAge: 365 * 24 * 60 * 60, // 1 year
                path: "/",
            });
        }

        // Set permissions cookie (deprecated but keeping for middleware compatibility during migration)
        const { getPermissionsByRoleName } = await import("@/lib/permissions");
        const permissions = await getPermissionsByRoleName(user.role);
        cookies().set("user_permissions", JSON.stringify(permissions), {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 60 * 60 * 24, // 1 day
            path: "/",
        });

        // Update last login
        await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() }
        });

        // Check if user must change password
        if (user.mustChangePassword) {
            return { redirect: "/change-password" };
        }

        // Determine redirect target based on automated helper
        const homeUrl = await getHomeUrl();
        return { redirect: homeUrl };

    } catch (error) {
        console.error(error);
        const { t } = await getTranslations();
        return { error: t('errors.generic') };
    }
}

export async function changePassword(currentPassword: string, newPassword: string) {
    const userId = cookies().get("user_id")?.value;
    if (!userId) {
        return { success: false, error: "No autenticado" };
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return { success: false, error: "Usuario no encontrado" };
        }

        // Verify current password
        const isPasswordCorrect = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordCorrect) {
            return { success: false, error: "Contraseña actual incorrecta" };
        }

        // Update password and clear mustChangePassword flag
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: userId },
            data: {
                password: hashedPassword,
                mustChangePassword: false
            }
        });

        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Error al cambiar la contraseña" };
    }
}

export async function logout() {
    console.log("[AUTH] Logging out user...");
    const cookieStore = cookies();
    cookieStore.set("session", "", { path: "/", expires: new Date(0) });
    cookieStore.set("user_id", "", { path: "/", expires: new Date(0) });
    cookieStore.set("user_role", "", { path: "/", expires: new Date(0) });
    cookieStore.set("client_id", "", { path: "/", expires: new Date(0) });
    cookieStore.set("user_permissions", "", { path: "/", expires: new Date(0) });
    cookieStore.set("user_email", "", { path: "/", expires: new Date(0) });
    console.log("[AUTH] Cookies cleared, redirecting to login");
    redirect("/login");
}
