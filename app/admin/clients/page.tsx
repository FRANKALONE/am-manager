import { getClients, deleteClient } from "@/app/actions/clients";
import { getParametersByCategory } from "@/app/actions/parameters";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ClientsTable } from "./components/clients-table";

export default async function ClientsPage() {
    const clients = await getClients();
    const managers = await getParametersByCategory("MANAGER");

    // Map for quick lookup: Value -> Label
    const managerMap = managers.reduce((acc, curr) => {
        acc[curr.value] = curr.label;
        return acc;
    }, {} as Record<string, string>);

    async function deleteClientAction(id: string) {
        "use server";
        await deleteClient(id);
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
                    <p className="text-muted-foreground">
                        Gestión de la cartera de clientes.
                    </p>
                </div>
                <Link href="/admin/clients/new">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> Nuevo Cliente
                    </Button>
                </Link>
            </div>

            <ClientsTable
                clients={clients}
                managerMap={managerMap}
                deleteClientAction={deleteClientAction}
            />
        </div>
    );
}
