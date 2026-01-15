import { getContractValidityData } from "@/app/actions/analytics";
import { SharedHeader } from "@/app/components/shared-header";
import { AdminSidebar } from "@/app/admin/components/sidebar";
import { ContractValidityView } from "./contract-validity-view";
import { getTranslations } from "@/lib/get-translations";

export default async function ContractValidityPage() {
    const clientsData = await getContractValidityData();
    const { t } = await getTranslations();

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
            <AdminSidebar />
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <SharedHeader title={t("admin.analytics.contractValidity")} />
                <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                    <ContractValidityView initialData={clientsData} />
                </main>
            </div>
        </div>
    );
}
