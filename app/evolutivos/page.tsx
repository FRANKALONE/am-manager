import { SharedHeader } from "@/app/components/shared-header";
import { EvolutivosTableView } from "./components/evolutivos-table-view";
import { getCurrentUser, getAuthSession, hasPermission } from "@/lib/auth";
import { getClientsWithEvolutivos, getEvolutivosByClient } from "@/app/actions/evolutivos";
import { redirect } from "next/navigation";
import { getTranslations } from "@/lib/get-translations";

export default async function EvolutivosPage() {
    const user = await getCurrentUser();
    const session = await getAuthSession();
    const { t } = await getTranslations();

    if (!user || !session) {
        redirect("/login");
    }

    const isAdmin = session.userRole === "ADMIN";
    const canViewAll = isAdmin || session.permissions.view_all_clients;

    // For clients, the initialClientId is their own. For others, it's empty initially.
    const initialClientId = canViewAll ? "" : (user.clientId || "");

    const clients = await getClientsWithEvolutivos();

    let initialData: any = { evolutivos: [], hitos: [], workPackages: [] };
    if (initialClientId) {
        initialData = await getEvolutivosByClient(initialClientId);
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <SharedHeader title={t('admin.evolutivos')} />

            <div className="max-w-7xl mx-auto px-4 py-8 md:px-8">
                <div className="mb-8">
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">{t('admin.evolutivos')}</h2>
                    <p className="text-slate-500 mt-1">{t('admin.evolutivosDesc')}</p>
                </div>

                <EvolutivosTableView
                    user={user as any}
                    clients={clients as any}
                    initialData={initialData}
                    isAdmin={isAdmin}
                    initialClientId={initialClientId}
                />
            </div>
        </div>
    );
}
