import { getClients } from "@/app/actions/clients";
import { getWorkPackages } from "@/app/actions/work-packages";
import { ClientDashboard } from "./client-dashboard-view";
import { getMe } from "@/app/actions/users";
import { redirect } from "next/navigation";
import { getPermissionsByRoleName } from "@/lib/permissions";
import { SharedHeader } from "@/app/components/shared-header";

export default async function ClientDashboardPage() {
    const user = await getMe();

    if (!user) {
        redirect("/login");
    }

    // Only fetch clients if admin, but here we just need the user's client potentially
    const clients = await getClients();

    // Fetch WPs for the user's client
    const workPackages = await getWorkPackages({
        clientId: user.clientId || undefined,
        status: "all" // Dashboard can show historical WPs too
    });

    const permissions = await getPermissionsByRoleName(user.role);

    return (
        <ClientDashboard
            user={user}
            workPackages={workPackages}
            clients={clients}
            permissions={permissions}
        />
    );
}
