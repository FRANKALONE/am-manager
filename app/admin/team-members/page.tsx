import { getTeamMembersForManagement } from "@/app/actions/team-members";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TeamMembersTable } from "./components/team-members-table";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { syncTeamsFromTempo } from "@/app/actions/capacity";
import { revalidatePath } from "next/cache";

export default async function TeamMembersPage() {
    const members = await getTeamMembersForManagement();

    async function handleSync() {
        "use server";
        await syncTeamsFromTempo();
        revalidatePath("/admin/team-members");
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gestión de Equipo</h1>
                    <p className="text-muted-foreground">
                        Categoriza a los miembros del equipo para aplicar tarifas de regularización personalizadas
                    </p>
                </div>
                <form action={handleSync}>
                    <Button variant="outline">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Sincronizar desde Tempo
                    </Button>
                </form>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Miembros del Equipo ({members.length})</CardTitle>
                    <CardDescription>
                        Asigna niveles (Junior, Senior, etc.) para usar en regularizaciones basadas en categorías
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <TeamMembersTable members={members} />
                </CardContent>
            </Card>
        </div>
    );
}
