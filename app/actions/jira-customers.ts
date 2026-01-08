'use server';

/**
 * Server Actions para gestionar usuarios de cliente de JIRA
 * v2601.4
 */

import { prisma } from '@/lib/prisma';
import {
    getServiceDeskByProjectKey,
    getOrganizationsByServiceDesk,
    getUsersByOrganization
} from '@/lib/jira-customers';
import { revalidatePath } from 'next/cache';

/**
 * Sincronizar usuarios JIRA de un cliente
 */
export async function syncClientJiraUsers(clientId: string) {
    try {
        // Obtener cliente con su proyecto JIRA
        const client = await prisma.client.findUnique({
            where: { id: clientId },
            select: { id: true, name: true, jiraProjectKey: true }
        });

        if (!client) {
            return { success: false, error: 'Cliente no encontrado' };
        }

        if (!client.jiraProjectKey) {
            return { success: false, error: 'Cliente no tiene proyecto JIRA configurado' };
        }

        // Si hay varias claves (separadas por coma), tomamos solo la primera para la gestión de usuarios
        const mainProjectKey = client.jiraProjectKey.split(',')[0].trim();

        // Obtener Service Desk
        const serviceDesk = await getServiceDeskByProjectKey(mainProjectKey);

        if (!serviceDesk) {
            return {
                success: false,
                error: 'El proyecto no es un Service Desk o no existe'
            };
        }

        // Obtener organizaciones
        const jiraOrganizations = await getOrganizationsByServiceDesk(serviceDesk.id);

        if (jiraOrganizations.length === 0) {
            return {
                success: true,
                message: 'No se encontraron organizaciones para este Service Desk',
                stats: { organizations: 0, users: 0 }
            };
        }

        let totalUsers = 0;
        let organizationsCreated = 0;

        // Procesar cada organización
        for (const jiraOrg of jiraOrganizations) {
            // Crear o actualizar organización
            const organization = await prisma.jiraOrganization.upsert({
                where: { jiraOrgId: jiraOrg.id },
                create: {
                    jiraOrgId: jiraOrg.id,
                    name: jiraOrg.name,
                    clientId: client.id,
                    lastSyncAt: new Date()
                },
                update: {
                    name: jiraOrg.name,
                    lastSyncAt: new Date()
                }
            });

            organizationsCreated++;

            // Obtener usuarios de la organización
            const jiraUsers = await getUsersByOrganization(jiraOrg.id);
            const jiraUserAccountIds = jiraUsers.map(u => u.accountId);

            // Eliminar usuarios locales que ya no existen en JIRA para esta organización
            const deleteResult = await prisma.jiraCustomerUser.deleteMany({
                where: {
                    organizationId: organization.id,
                    accountId: { notIn: jiraUserAccountIds }
                }
            });

            if (deleteResult.count > 0) {
                console.log(`[SYNC] Deleted ${deleteResult.count} users for organization ${organization.name}`);
            }

            // Crear o actualizar usuarios
            for (const jiraUser of jiraUsers) {
                await prisma.jiraCustomerUser.upsert({
                    where: { accountId: jiraUser.accountId },
                    create: {
                        accountId: jiraUser.accountId,
                        displayName: jiraUser.displayName,
                        emailAddress: jiraUser.emailAddress,
                        active: jiraUser.active,
                        accountType: jiraUser.accountType,
                        organizationId: organization.id,
                        clientId: client.id,
                        lastSyncAt: new Date()
                    },
                    update: {
                        displayName: jiraUser.displayName,
                        emailAddress: jiraUser.emailAddress,
                        active: jiraUser.active,
                        accountType: jiraUser.accountType,
                        lastSyncAt: new Date()
                    }
                });

                totalUsers++;
            }
        }

        revalidatePath('/admin/jira-customers');

        return {
            success: true,
            message: `Sincronización completada: ${organizationsCreated} organizaciones, ${totalUsers} usuarios`,
            stats: {
                organizations: organizationsCreated,
                users: totalUsers
            }
        };

    } catch (error) {
        console.error('Error syncing JIRA users:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error desconocido'
        };
    }
}

/**
 * Obtener todos los usuarios JIRA (admin)
 */
export async function getAllJiraCustomerUsers() {
    try {
        const users = await prisma.jiraCustomerUser.findMany({
            include: {
                client: { select: { id: true, name: true } },
                organization: { select: { id: true, name: true } },
                linkedUser: { select: { id: true, name: true, email: true } }
            },
            orderBy: [
                { client: { name: 'asc' } },
                { displayName: 'asc' }
            ]
        });

        return { success: true, users };
    } catch (error) {
        console.error('Error fetching JIRA users:', error);
        return { success: false, error: 'Error al obtener usuarios' };
    }
}

/**
 * Obtener usuarios JIRA de un cliente específico
 */
export async function getJiraCustomerUsersByClient(clientId: string) {
    try {
        const users = await prisma.jiraCustomerUser.findMany({
            where: { clientId },
            include: {
                organization: { select: { id: true, name: true } },
                linkedUser: { select: { id: true, name: true, email: true } }
            },
            orderBy: { displayName: 'asc' }
        });

        return { success: true, users };
    } catch (error) {
        console.error('Error fetching client JIRA users:', error);
        return { success: false, error: 'Error al obtener usuarios' };
    }
}

/**
 * Vincular usuario JIRA con usuario de la app
 */
export async function linkJiraUserToAppUser(jiraUserId: string, appUserId: string) {
    try {
        // Verificar que el usuario JIRA existe
        const jiraUser = await prisma.jiraCustomerUser.findUnique({
            where: { id: jiraUserId }
        });

        if (!jiraUser) {
            return { success: false, error: 'Usuario JIRA no encontrado' };
        }

        // Verificar que el usuario app existe y pertenece al mismo cliente
        const appUser = await prisma.user.findUnique({
            where: { id: appUserId }
        });

        if (!appUser) {
            return { success: false, error: 'Usuario de la app no encontrado' };
        }

        if (appUser.clientId !== jiraUser.clientId) {
            return { success: false, error: 'El usuario no pertenece al mismo cliente' };
        }

        // Vincular
        await prisma.jiraCustomerUser.update({
            where: { id: jiraUserId },
            data: { linkedUserId: appUserId }
        });

        revalidatePath('/admin/jira-customers');

        return { success: true, message: 'Usuario vinculado correctamente' };
    } catch (error) {
        console.error('Error linking users:', error);
        return { success: false, error: 'Error al vincular usuarios' };
    }
}

/**
 * Desvincular usuario JIRA
 */
export async function unlinkJiraUser(jiraUserId: string) {
    try {
        await prisma.jiraCustomerUser.update({
            where: { id: jiraUserId },
            data: { linkedUserId: null }
        });

        revalidatePath('/admin/jira-customers');

        return { success: true, message: 'Usuario desvinculado correctamente' };
    } catch (error) {
        console.error('Error unlinking user:', error);
        return { success: false, error: 'Error al desvincular usuario' };
    }
}

/**
 * Crear usuario de la app desde usuario JIRA
 */
export async function createAppUserFromJiraUser(
    jiraUserId: string,
    additionalData: {
        password: string;
        role: string;
        workPackageIds?: string;
    }
) {
    try {
        const jiraUser = await prisma.jiraCustomerUser.findUnique({
            where: { id: jiraUserId },
            include: { client: true }
        });

        if (!jiraUser) {
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

        // Crear usuario
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(additionalData.password, 10);

        const newUser = await prisma.user.create({
            data: {
                name: jiraUser.displayName.split(' ')[0] || jiraUser.displayName,
                surname: jiraUser.displayName.split(' ').slice(1).join(' ') || '',
                email: jiraUser.emailAddress,
                password: hashedPassword,
                role: additionalData.role,
                clientId: jiraUser.clientId,
                workPackageIds: additionalData.workPackageIds,
                mustChangePassword: true
            }
        });

        // Vincular automáticamente
        await prisma.jiraCustomerUser.update({
            where: { id: jiraUserId },
            data: { linkedUserId: newUser.id }
        });

        revalidatePath('/admin/jira-customers');
        revalidatePath('/admin/users');

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
