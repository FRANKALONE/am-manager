import { getTeamWorkload, getLoadForecast, getTeamMembers, getTeams } from "@/app/actions/capacity";
import { CapacityDashboard } from "./capacity-dashboard";
import { SharedHeader } from "@/app/components/shared-header";
import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function CapacityPage() {
    const session = await getAuthSession();
    if (!session || !session.permissions.manage_capacity) {
        redirect("/");
    }

    const workloadData = await getTeamWorkload();
    const forecastData = await getLoadForecast();
    const members = await getTeamMembers();
    const teams = await getTeams();

    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            <SharedHeader title="Gestión de Capacidades AMA" />
            <main className="flex-1 p-6 md:p-10">
                <CapacityDashboard
                    initialWorkload={workloadData}
                    forecast={forecastData}
                    members={members}
                    teams={teams}
                />
            </main>
        </div>
    );
}
