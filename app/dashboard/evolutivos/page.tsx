import { getCurrentUser, getAuthSession } from "@/lib/auth";
import { getClientsWithEvolutivos, getEvolutivosByClient } from "@/app/actions/evolutivos";
import { EvolutivosView } from "./evolutivos-view";
import { redirect } from "next/navigation";
import { SharedHeader } from "@/app/components/shared-header";
import { Footer } from "@/app/components/footer";

export default async function EvolutivosPage() {
    const user = await getCurrentUser();
    const session = await getAuthSession();

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
        <>
            <SharedHeader title="Gestión de Evolutivos" />
            <main className="container mx-auto py-8 px-4 md:px-6 flex-1">
                <EvolutivosView
                    user={user as any}
                    clients={clients as any}
                    initialData={initialData}
                    isAdmin={isAdmin}
                    initialClientId={initialClientId}
                />
            </main>
            <Footer />
        </>
    );
}
