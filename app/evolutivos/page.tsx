import { SharedHeader } from "@/app/components/shared-header";
import { EvolutivosTableView } from "./components/evolutivos-table-view";
import { getMe } from "@/app/actions/users";
import { getClientsWithEvolutivos, getEvolutivosByClient } from "@/app/actions/evolutivos";
import { redirect } from "next/navigation";

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
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <SharedHeader title="Gestión de Evolutivos" />

            <div className="max-w-7xl mx-auto px-4 py-8 md:px-8">
                <div className="mb-8">
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Gestión de Evolutivos</h2>
                    <p className="text-slate-500 mt-1">Seguimiento detallado de hitos y planificación de evolutivos.</p>
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
