import { prisma } from "@/lib/prisma";
import { getCurrentUser, getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function FixDBPage() {
    const user = await getCurrentUser();
    const session = await getAuthSession();

    // Seguridad: Solo ADMIN puede ejecutar esto
    if (!user || !session || session.userRole !== 'ADMIN') {
        redirect('/dashboard');
    }

    const results: string[] = [];
    results.push("Iniciando reparación de base de datos desde el servidor...");

    try {
        // 1. Verificar tablas
        const tables = await prisma.$queryRawUnsafe("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'") as any[];
        const tableNames = tables.map(t => t.tablename);
        results.push(`Tablas actuales: ${tableNames.join(", ")}`);

        // 2. Crear EmailLog
        if (!tableNames.includes('EmailLog')) {
            results.push("Creando tabla EmailLog...");
            await prisma.$executeRawUnsafe(`
                CREATE TABLE IF NOT EXISTS "EmailLog" (
                    "id" TEXT PRIMARY KEY,
                    "to" TEXT NOT NULL,
                    "subject" TEXT NOT NULL,
                    "content" TEXT,
                    "status" TEXT NOT NULL,
                    "error" TEXT,
                    "messageId" TEXT,
                    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            `);
            results.push("✅ Tabla EmailLog creada.");
        }

        // 3. Crear SystemSetting
        if (!tableNames.includes('SystemSetting')) {
            results.push("Creando tabla SystemSetting...");
            await prisma.$executeRawUnsafe(`
                CREATE TABLE IF NOT EXISTS "SystemSetting" (
                    "key" TEXT PRIMARY KEY,
                    "value" TEXT NOT NULL,
                    "description" TEXT,
                    "group" TEXT NOT NULL DEFAULT 'GENERAL',
                    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            `);
            results.push("✅ Tabla SystemSetting creada.");
        }

        // 4. Actualizar NotificationSetting
        if (tableNames.includes('NotificationSetting')) {
            results.push("Verificando columnas en NotificationSetting...");
            const columns = await prisma.$queryRawUnsafe("SELECT column_name FROM information_schema.columns WHERE table_name = 'NotificationSetting'") as any[];
            const colNames = columns.map((c: any) => c.column_name);

            if (!colNames.includes('sendEmail')) {
                results.push("Añadiendo columna 'sendEmail'...");
                await prisma.$executeRawUnsafe('ALTER TABLE "NotificationSetting" ADD COLUMN "sendEmail" BOOLEAN DEFAULT false');
            }
            if (!colNames.includes('appMessage')) {
                results.push("Añadiendo columna 'appMessage'...");
                await prisma.$executeRawUnsafe('ALTER TABLE "NotificationSetting" ADD COLUMN "appMessage" TEXT');
            }
            if (!colNames.includes('emailSubject')) {
                results.push("Añadiendo columna 'emailSubject'...");
                await prisma.$executeRawUnsafe('ALTER TABLE "NotificationSetting" ADD COLUMN "emailSubject" TEXT');
            }
            if (!colNames.includes('emailMessage')) {
                results.push("Añadiendo columna 'emailMessage'...");
                await prisma.$executeRawUnsafe('ALTER TABLE "NotificationSetting" ADD COLUMN "emailMessage" TEXT');
            }
            results.push("✅ NotificationSetting actualizado.");
        }

        // 5. Asegurar permisos del rol CLIENTE
        results.push("Verificando permisos del rol CLIENTE...");
        const clienteRole = await prisma.role.findUnique({ where: { name: 'CLIENTE' } });
        if (clienteRole) {
            let perms: Record<string, any> = {};
            try {
                perms = JSON.parse(clienteRole.permissions || '{}');
            } catch (e) {
                perms = {};
            }

            if (!perms['manage_client_users']) {
                results.push("Añadiendo permiso 'manage_client_users' al rol CLIENTE...");
                perms['manage_client_users'] = true;
                await prisma.role.update({
                    where: { id: clienteRole.id },
                    data: { permissions: JSON.stringify(perms) }
                });
                results.push("✅ Permisos del rol CLIENTE actualizados.");
            } else {
                results.push("✅ El rol CLIENTE ya tiene los permisos correctos.");
            }
        } else {
            results.push("⚠️ No se encontró el rol CLIENTE para actualizar.");
        }

        // 6. Sincronizar plantillas de notificación críticas
        results.push("Sincronizando plantillas de notificaciones...");
        const renewalSetting = await prisma.notificationSetting.findUnique({ where: { type: 'CONTRACT_RENEWED' } });
        if (renewalSetting) {
            await prisma.notificationSetting.update({
                where: { type: 'CONTRACT_RENEWED' },
                data: {
                    appMessage: '✅ Renovación Automática: {clientName} - {wpName}',
                    emailSubject: '✅ Renovación Automática: {clientName} - {wpName}',
                    emailMessage: 'Se ha renovado automáticamente el WP "{wpName}" hasta el {endDate} con un incremento del {ipcValue}% (Tarifa: {newRate}€).'
                }
            });
            results.push("✅ Plantilla CONTRACT_RENEWED actualizada.");
        }

        results.push("🚀 Proceso completado con éxito.");
    } catch (error: any) {
        results.push(`❌ ERROR CRÍTICO: ${error.message}`);
    }

    return (
        <div className="p-10 font-mono text-sm space-y-2">
            <h1 className="text-xl font-bold mb-4">DB Schema Fix Tool</h1>
            {results.map((line, i) => (
                <div key={i} className={line.includes('❌') ? 'text-red-500' : line.includes('✅') ? 'text-green-500' : ''}>
                    {line}
                </div>
            ))}
            <div className="mt-8">
                <a href="/admin/emails" className="text-blue-500 underline">Volver a Gestión de Emails</a>
            </div>
        </div>
    );
}
