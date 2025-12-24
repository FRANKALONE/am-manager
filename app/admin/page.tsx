
import { getClients } from "@/app/actions/clients";
import { getWorkPackages } from "@/app/actions/work-packages";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Briefcase } from "lucide-react";

export default async function AdminDashboardPage() {
    const clients = await getClients();
    const wps = await getWorkPackages();

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Clientes Totales</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{clients.length}</div>
                        <p className="text-xs text-muted-foreground">Clientes registrados</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Work Packages</CardTitle>
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{wps.length}</div>
                        <p className="text-xs text-muted-foreground">Servicios contratados</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
