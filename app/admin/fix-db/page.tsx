import { prisma } from "@/lib/prisma";
import { getMe } from "@/app/actions/users";
import { redirect } from "next/navigation";

export default async function FixDBPage() {
    const user = await getMe();

    // Seguridad: Solo ADMIN puede ejecutar esto
    if (!user || user.role !== 'ADMIN') {
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
