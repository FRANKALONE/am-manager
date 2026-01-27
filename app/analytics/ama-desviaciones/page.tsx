import { AdminSidebar } from "@/app/admin/components/sidebar";
import { SharedHeader } from "@/app/components/shared-header";
import { DeviationIndicator } from "@/components/ama-evolutivos/DeviationIndicator";
import { getAuthSession } from "@/lib/auth";
import { MoveLeft } from "lucide-react";
import Link from "next/link";

export default async function AMADeviationReportPage() {
    const session = await getAuthSession();
    const isAdmin = session?.userRole === 'ADMIN';

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
            {isAdmin && <AdminSidebar />}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <SharedHeader title="Desvío de Tareas Evolutivas" />
                <main className="flex-1 overflow-y-auto p-8 scrollbar-thin">
                    <div className="max-w-7xl mx-auto space-y-8">
                        <div className="flex items-center justify-between">
                            <Link
                                href="/analytics"
                                className="flex items-center gap-2 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors font-medium text-sm group"
                            >
                                <MoveLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                                Volver a Informes
                            </Link>
                        </div>

                        <header className="mb-2">
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                                Desvío de Vencimiento de Tareas Evolutivas
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400">
                                Análisis de cumplimiento de planificaciones y gestión operativa de hitos AMA.
                            </p>
                        </header>

                        <div className="pt-4">
                            <DeviationIndicator />
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
