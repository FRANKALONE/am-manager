import { getClients } from "@/app/actions/clients";
import { getWorkPackages } from "@/app/actions/work-packages";
import { ClientDashboard } from "./client-dashboard-view";
import { getCurrentUser, getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ClientDashboardPage() {
    const user = await getCurrentUser();
    const session = await getAuthSession();

    if (!user || !session) {
        redirect("/login");
    }

    // Only fetch clients if admin, but here we just need the user's client potentially
    const clients = await getClients();

    // Fetch WPs for the user's client
    const workPackages = await getWorkPackages({
        clientId: user.clientId || session.clientId || undefined,
        status: "all" // Dashboard can show historical WPs too
    });

    const permissions = session.permissions;

    return (
        <ClientDashboard
            user={user}
            workPackages={workPackages}
            clients={clients}
            permissions={permissions}
        />
    );
}
