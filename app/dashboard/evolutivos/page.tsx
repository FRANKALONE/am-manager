import { getMe } from "@/app/actions/users";
import { getClientsWithEvolutivos, getEvolutivosByClient } from "@/app/actions/evolutivos";
import { EvolutivosView } from "./evolutivos-view";
import { redirect } from "next/navigation";
import { SharedHeader } from "@/app/components/shared-header";
import { Footer } from "@/app/components/footer";

export default async function EvolutivosPage() {
    const user = await getMe();

    if (!user) {
        redirect("/login");
    }

    const isAdmin = user.role === "ADMIN";
    const isGerente = user.role === "GERENTE";
    const initialClientId = isAdmin || isGerente ? "" : (user.clientId || "");

    const clients = (isAdmin || isGerente)
        ? await getClientsWithEvolutivos(isGerente ? user.id : undefined)
        : [];

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
