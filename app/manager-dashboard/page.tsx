import { getDashboardClients } from "@/app/actions/dashboard";
import { getCurrentUser, getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ManagerDashboardView } from "./manager-dashboard-view";
import { SharedHeader } from "@/app/components/shared-header";
import { Footer } from "@/app/components/footer";

export default async function ManagerDashboardPage() {
    const user = await getCurrentUser();
    const session = await getAuthSession();

    if (!user || !session) {
        redirect("/login");
    }

    // Check for unread landings to redirect
    const { getLandingRedirect } = await import("@/lib/auth");
    const landingRedirect = await getLandingRedirect(session.userId, session.userRole);
    if (landingRedirect) {
        redirect(landingRedirect);
    }

    if (!session.permissions.view_dashboard) {
        redirect("/client-dashboard");
    }

    const clients = await getDashboardClients();
    const isAdmin = session.userRole === 'ADMIN' || session.userRole === 'GERENTE';

    return (
        <div className="flex flex-col min-h-screen">
            <SharedHeader title="Dashboard Gerentes" />
            <main className="flex-grow">
                <ManagerDashboardView
                    user={user as any}
                    clients={clients}
                    permissions={session.permissions}
                    isAdmin={isAdmin}
                />
            </main>
            <Footer />
        </div>
    );
}
