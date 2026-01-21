import { getContractValidityData } from "@/app/actions/analytics";
import { SharedHeader } from "@/app/components/shared-header";
import { AdminSidebar } from "@/app/admin/components/sidebar";
import { ContractValidityView } from "./contract-validity-view";
import { getTranslations } from "@/lib/get-translations";
import { getAuthSession } from "@/lib/auth";

export default async function ContractValidityPage() {
    try {
        const session = await getAuthSession();
        const isAdmin = session?.userRole === 'ADMIN';
        const clientsData = await getContractValidityData();
        const { t } = await getTranslations();

        // Serialize data to ensure it's safe for client component
        const serializedData = JSON.parse(JSON.stringify(clientsData));

        return (
            <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
                {isAdmin && <AdminSidebar />}
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                    <SharedHeader title={t("admin.analytics.contractValidity")} />
                    <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                        <ContractValidityView initialData={serializedData} />
                    </main>
                </div>
            </div>
        );
    } catch (error) {
        console.error("Error loading Analytics page:", error);
        return (
            <div className="flex h-screen bg-slate-50 items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">Error al cargar Analytics</h1>
                    <p className="text-slate-600">{error instanceof Error ? error.message : "Error desconocido"}</p>
                </div>
            </div>
        );
    }
}
