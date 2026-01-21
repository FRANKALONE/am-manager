"use server";

import { SharedHeader } from "@/app/components/shared-header";
import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { AmDashboardView } from "./components/am-dashboard-view";
import { getAmManagementReport } from "@/app/actions/analytics-am";
import { getClients } from "@/app/actions/clients";

export default async function AmDashboardPage({
    searchParams
}: {
    searchParams: { year?: string; clientId?: string }
}) {
    const session = await getAuthSession();
    if (!session) redirect("/login");

    const isAdmin = session.userRole === "ADMIN";
    const canView = isAdmin || await hasPermission(session.userRole, "view_analytics_am_dashboard");

    if (!canView) {
        redirect("/analytics");
    }

    const currentYear = parseInt(searchParams.year || new Date().getFullYear().toString());
    const clientId = searchParams.clientId;

    // Fetch data for current year and previous year (for COMPARATIVAS)
    const [currentData, previousData, allClients] = await Promise.all([
        getAmManagementReport(currentYear, clientId),
        getAmManagementReport(currentYear - 1, clientId),
        getClients()
    ]);

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <SharedHeader title="Cuadro de Mando de AM" />
                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    <AmDashboardView
                        currentData={currentData}
                        previousData={previousData}
                        year={currentYear}
                        allClients={allClients}
                        selectedClientId={clientId}
                    />
                </main>
            </div>
        </div>
    );
}
