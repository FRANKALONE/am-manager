import { getWpAccumulatedConsumptionReport } from "@/app/actions/analytics";
import { SharedHeader } from "@/app/components/shared-header";
import { AdminSidebar } from "@/app/admin/components/sidebar";
import { WpAccumulatedConsumptionView } from "./wp-accumulated-consumption-view";
import { getAuthSession } from "@/lib/auth";

export default async function WpAccumulatedConsumptionPage() {
    try {
        const session = await getAuthSession();
        const isAdmin = session?.userRole === 'ADMIN';
        const data = await getWpAccumulatedConsumptionReport();

        return (
            <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
                {isAdmin && <AdminSidebar />}
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                    <SharedHeader title="Estado de Consumos Acumulados" />
                    <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                        <WpAccumulatedConsumptionView initialData={data} />
                    </main>
                </div>
            </div>
        );
    } catch (error) {
        console.error("Error loading WP Accumulated Consumption page:", error);
        return (
            <div className="flex h-screen bg-slate-50 items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">Error al cargar el informe</h1>
                    <p className="text-slate-600">{error instanceof Error ? error.message : "Error desconocido"}</p>
                </div>
            </div>
        );
    }
}
