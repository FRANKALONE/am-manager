import { getDashboardClients } from "@/app/actions/dashboard";
import { getMe } from "@/app/actions/users";
import { getPermissionsByRoleName } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { ManagerDashboardView } from "./manager-dashboard-view";
import { SharedHeader } from "@/app/components/shared-header";
import { Footer } from "@/app/components/footer";

export default async function ManagerDashboardPage() {
    const user = await getMe();

    if (!user) {
        redirect("/login");
    }

    const permissions = await getPermissionsByRoleName(user.role);

    if (!permissions.view_dashboard) {
        redirect("/client-dashboard");
    }

    const clients = await getDashboardClients(user.role === "GERENTE" || !permissions.view_all_clients ? user.id : undefined);
    // const permissions = await getPermissionsByRoleName(user.role); // moved up

    return (
        <div className="flex flex-col min-h-screen">
            <SharedHeader title="Dashboard Gerentes" />
            <main className="flex-grow">
                <ManagerDashboardView
                    user={user}
                    clients={clients}
                    permissions={permissions}
                />
            </main>
            <Footer />
        </div>
    );
}
