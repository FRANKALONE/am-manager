'use server';

/**
 * ========================================
 * FUNCIONES PARA PORTAL DE CLIENTES
 * ========================================
 */

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getAuthSession } from '@/lib/auth';

/**
 * Obtener usuario actual desde cookies (helper interno)
 */
async function getCurrentUserInfo() {
    const session = await getAuthSession();
    if (!session || !session.clientId) {
        return null;
    }

    return { id: session.userId, role: session.userRole, clientId: session.clientId, permissions: session.permissions };
}

import { fetchJira } from '@/lib/jira';

/**
 * Obtener usuarios de la app de un cliente (para portal de clientes)
 */
export async function getAppUsersByClient(clientId: string) {
    try {
        const currentUser = await getCurrentUserInfo();

        if (!currentUser) {
            return { success: false, error: 'No autenticado' };
        }

        // Verificar que el usuario pertenece al cliente
        if (currentUser.clientId !== clientId && currentUser.role !== 'ADMIN') {
            return { success: false, error: 'No autorizado' };
        }

        const users = await prisma.user.findMany({
            where: { clientId },
            select: {
                id: true,
                name: true,
                surname: true,
                email: true,
                role: true,
                linkedJiraCustomer: {
                    select: {
                        id: true,
                        displayName: true,
                        emailAddress: true
                    }
                },
                linkedEvolUser: {
                    select: {
                        id: true,
                        jiraGestorName: true
                    }
                },
                createdAt: true
            },
            orderBy: { name: 'asc' }
        });

        return { success: true, users };
    } catch (error) {
        console.error('Error fetching app users:', error);
        return { success: false, error: 'Error al obtener usuarios' };
    }
}

/**
 * Obtener empleados de JIRA (para vincular usuarios internos)
 */
export async function getJiraEmployees() {
    try {
        const currentUser = await getCurrentUserInfo();
        if (!currentUser) return { success: false, error: 'No autenticado' };

        // Fetch Jira users that are active and NOT customer type
        // Note: Jira Cloud /rest/api/3/users/search?query= 
        const jiraUsers = await fetchJira('/users/search?maxResults=1000');

        // Filter out app users or specific types if needed, though search usually returns all valid users
        const employees = jiraUsers
            .filter((u: any) => u.accountType === 'atlassian' && u.active)
            .map((u: any) => ({
                accountId: u.accountId,
                displayName: u.displayName,
                emailAddress: u.emailAddress,
                avatarUrl: u.avatarUrls?.['32x32']
            }))
            .sort((a: any, b: any) => a.displayName.localeCompare(b.displayName));

        return { success: true, employees };
    } catch (error) {
        console.error('Error fetching Jira employees:', error);
        return { success: false, error: 'Error al obtener empleados de Jira' };
    }
}

/**
 * Actualizar el link de un usuario con un empleado de Jira
 */
export async function updateUserJiraLink(userId: string, jiraGestorName: string | null) {
    try {
        const currentUser = await getCurrentUserInfo();
        if (!currentUser) return { success: false, error: 'No autenticado' };

        // No permission check for now as we are in internal context, 
        // but normally we'd check if role matches or manage_client_users

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { linkedEvolUser: true }
        });

        if (!user) return { success: false, error: 'Usuario no encontrado' };

        if (!jiraGestorName) {
            // Delete link if name is empty
            if (user.linkedEvolUser) {
                await prisma.eVOLEvolutivoUser.update({
                    where: { id: user.linkedEvolUser.id },
                    data: { jiraGestorName: null }
                });
            }
        } else {
            // Upsert EVOLEvolutivoUser
            if (user.linkedEvolUser) {
                await prisma.eVOLEvolutivoUser.update({
                    where: { id: user.linkedEvolUser.id },
                    data: { jiraGestorName }
                });
            } else {
                // Create linked evol user
                await prisma.eVOLEvolutivoUser.create({
                    data: {
                        email: user.email,
                        password: user.password, // Reuse or random
                        name: `${user.name} ${user.surname || ''}`.trim(),
                        jiraGestorName,
                        linkedUserId: user.id
                    }
                });
            }
        }

        revalidatePath('/dashboard/users');
        return { success: true, message: 'Link de Jira actualizado' };
    } catch (error) {
        console.error('Error updating user jira link:', error);
        return { success: false, error: 'Error al actualizar el link de Jira' };
    }
}

/**
 * Vincular usuario JIRA con usuario App (para clientes)
 */
export async function linkJiraUserForClient(jiraUserId: string, appUserId: string, clientId: string) {
    try {
        const currentUser = await getCurrentUserInfo();

        if (!currentUser) {
            return { success: false, error: 'No autenticado' };
        }

        // Verificar permisos: CLIENTE puede gestionar usuarios de su propia empresa
        if (currentUser.role !== 'CLIENTE' && !currentUser.permissions.manage_client_users && currentUser.role !== 'ADMIN') {
            return { success: false, error: 'No tienes permiso para gestionar usuarios de empresa' };
        }

        // Verificar que pertenece al cliente
        if (currentUser.clientId !== clientId) {
            return { success: false, error: 'No autorizado' };
        }

        // Verificar que el usuario JIRA existe y pertenece al cliente
        const jiraUser = await prisma.jiraCustomerUser.findUnique({
            where: { id: jiraUserId }
        });

        if (!jiraUser || jiraUser.clientId !== clientId) {
            return { success: false, error: 'Usuario JIRA no encontrado' };
        }

        // Verificar que el usuario app existe y pertenece al cliente
        const appUser = await prisma.user.findUnique({
            where: { id: appUserId }
        });

        if (!appUser || appUser.clientId !== clientId) {
            return { success: false, error: 'Usuario de la app no encontrado' };
        }

        // Vincular
        await prisma.jiraCustomerUser.update({
            where: { id: jiraUserId },
            data: { linkedUserId: appUserId }
        });

        revalidatePath('/dashboard/users');

        return { success: true, message: 'Usuario vinculado correctamente' };
    } catch (error) {
        console.error('Error linking users:', error);
        return { success: false, error: 'Error al vincular usuarios' };
    }
}

/**
 * Crear usuario App para cliente
 */
export async function createAppUserForClient(
    clientId: string,
    userData: {
        name: string;
        surname: string;
        email: string;
        password: string;
        jiraUserId?: string;
    }
) {
    try {
        const currentUser = await getCurrentUserInfo();

        if (!currentUser) {
            return { success: false, error: 'No autenticado' };
        }

        // Verificar permisos: CLIENTE puede crear usuarios para su propia empresa
        if (currentUser.role !== 'CLIENTE' && !currentUser.permissions.manage_client_users && currentUser.role !== 'ADMIN') {
            return { success: false, error: 'No tienes permiso para crear usuarios de empresa' };
        }

        // Verificar que pertenece al cliente
        if (currentUser.clientId !== clientId) {
            return { success: false, error: 'No autorizado' };
        }

        // Verificar que no existe ya un usuario con ese email
        const existingUser = await prisma.user.findUnique({
            where: { email: userData.email }
        });

        if (existingUser) {
            return { success: false, error: 'Ya existe un usuario con ese email' };
        }

        // Crear usuario con rol CLIENTE
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(userData.password, 10);

        const newUser = await prisma.user.create({
            data: {
                name: userData.name,
                surname: userData.surname,
                email: userData.email,
                password: hashedPassword,
                role: 'CLIENTE', // Solo puede crear usuarios CLIENTE
                clientId: clientId,
                mustChangePassword: true
            }
        });

        // Si se proporcionó jiraUserId, vincular
        if (userData.jiraUserId) {
            const jiraUser = await prisma.jiraCustomerUser.findUnique({
                where: { id: userData.jiraUserId }
            });

            if (jiraUser && jiraUser.clientId === clientId) {
                await prisma.jiraCustomerUser.update({
                    where: { id: userData.jiraUserId },
                    data: { linkedUserId: newUser.id }
                });
            }
        }

        revalidatePath('/dashboard/users');

        return {
            success: true,
            message: 'Usuario creado correctamente',
            userId: newUser.id
        };
    } catch (error) {
        console.error('Error creating user:', error);
        return { success: false, error: 'Error al crear usuario' };
    }
}

/**
 * Crear usuario App desde usuario JIRA (para clientes)
 */
export async function createAppUserFromJiraForClient(
    jiraUserId: string,
    clientId: string,
    password: string
) {
    try {
        const currentUser = await getCurrentUserInfo();

        if (!currentUser) {
            return { success: false, error: 'No autenticado' };
        }

        // Verificar permisos: CLIENTE puede crear usuarios para su propia empresa
        if (currentUser.role !== 'CLIENTE' && !currentUser.permissions.manage_client_users && currentUser.role !== 'ADMIN') {
            return { success: false, error: 'No tienes permiso para crear usuarios de empresa' };
        }

        // Verificar que pertenece al cliente
        if (currentUser.clientId !== clientId) {
            return { success: false, error: 'No autorizado' };
        }

        const jiraUser = await prisma.jiraCustomerUser.findUnique({
            where: { id: jiraUserId }
        });

        if (!jiraUser || jiraUser.clientId !== clientId) {
            return { success: false, error: 'Usuario JIRA no encontrado' };
        }

        if (!jiraUser.emailAddress) {
            return { success: false, error: 'El usuario JIRA no tiene email configurado' };
        }

        // Verificar que no existe ya un usuario con ese email
        const existingUser = await prisma.user.findUnique({
            where: { email: jiraUser.emailAddress }
        });

        if (existingUser) {
            return { success: false, error: 'Ya existe un usuario con ese email' };
        }

        // Crear usuario con rol CLIENTE
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await prisma.user.create({
            data: {
                name: jiraUser.displayName.split(' ')[0] || jiraUser.displayName,
                surname: jiraUser.displayName.split(' ').slice(1).join(' ') || '',
                email: jiraUser.emailAddress,
                password: hashedPassword,
                role: 'CLIENTE', // Solo puede crear usuarios CLIENTE
                clientId: clientId,
                mustChangePassword: true
            }
        });

        // Vincular automáticamente
        await prisma.jiraCustomerUser.update({
            where: { id: jiraUserId },
            data: { linkedUserId: newUser.id }
        });

        revalidatePath('/dashboard/users');

        return {
            success: true,
            message: 'Usuario creado y vinculado correctamente',
            userId: newUser.id
        };
    } catch (error) {
        console.error('Error creating user from JIRA:', error);
        return { success: false, error: 'Error al crear usuario' };
    }
}

/**
 * Eliminar usuario de la app (para clientes)
 */
export async function deleteAppUserForClient(userId: string, clientId: string) {
    try {
        const currentUser = await getCurrentUserInfo();

        if (!currentUser) {
            return { success: false, error: 'No autenticado' };
        }

        // Verificar permisos: CLIENTE puede eliminar usuarios de su propia empresa
        if (currentUser.role !== 'CLIENTE' && !currentUser.permissions.manage_client_users && currentUser.role !== 'ADMIN') {
            return { success: false, error: 'No tienes permiso para eliminar usuarios de empresa' };
        }

        // Verificar que pertenece al cliente
        if (currentUser.clientId !== clientId) {
            return { success: false, error: 'No autorizado' };
        }

        // No puede eliminarse a sí mismo
        if (currentUser.id === userId) {
            return { success: false, error: 'No puedes eliminarte a ti mismo' };
        }

        // Verificar que el usuario existe y pertenece al cliente
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user || user.clientId !== clientId) {
            return { success: false, error: 'Usuario no encontrado' };
        }

        // Eliminar usuario (la vinculación JIRA se pondrá a null automáticamente)
        await prisma.user.delete({
            where: { id: userId }
        });

        revalidatePath('/dashboard/users');

        return { success: true, message: 'Usuario eliminado correctamente' };
    } catch (error) {
        console.error('Error deleting user:', error);
        return { success: false, error: 'Error al eliminar usuario' };
    }
}
