import { getDashboardClients } from "@/app/actions/dashboard";
import { DashboardView } from "./components/dashboard-view";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { getPermissionsByRoleName } from "@/lib/permissions";
import { getMe } from "@/app/actions/users";

export default async function DashboardPage() {
    const user = await getMe();
    const isManager = user?.role === 'GERENTE';
    const clients = await getDashboardClients(isManager ? user?.id : undefined);
    const perms = await getPermissionsByRoleName(user?.role || "");

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex flex-col gap-2">
                    <h2 className="text-2xl font-bold tracking-tight">Dashboard de Consumos</h2>
                    <p className="text-muted-foreground">
                        Visualización de consumo y métricas clave por cliente.
                    </p>
                </div>
                <Link href="/admin-home">
                    <Button variant="outline" size="sm">
                        <Home className="w-4 h-4 mr-2" />
                        Volver al Inicio
                    </Button>
                </Link>
            </div>

            <DashboardView clients={clients} permissions={perms} userId={user?.id || ""} isAdmin={user?.role === 'ADMIN'} />
        </div>
    );
}
