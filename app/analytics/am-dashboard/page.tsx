"use server";

import { SharedHeader } from "@/app/components/shared-header";
import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { AmDashboardView } from "./components/am-dashboard-view";
import { getAmManagementReport } from "@/app/actions/analytics-am";

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

    // The new getAmManagementReport returns everything needed in a single structure
    const report = await getAmManagementReport(currentYear, clientId);

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <SharedHeader title="Cuadro de Mando de AM" />
                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    <AmDashboardView report={report} />
                </main>
            </div>
        </div>
    );
}
