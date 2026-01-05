import { getDashboardClients } from "@/app/actions/dashboard";
import { getMe } from "@/app/actions/users";
import { getPermissionsByRoleName } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { ManagerDashboardView } from "./manager-dashboard-view";

export default async function ManagerDashboardPage() {
    const user = await getMe();

    if (!user) {
        redirect("/login");
    }

    if (user.role !== "GERENTE" && user.role !== "ADMIN") {
        redirect("/client-dashboard");
    }

    const clients = await getDashboardClients(user.role === "GERENTE" ? user.id : undefined);
    const permissions = await getPermissionsByRoleName(user.role);

    return (
        <ManagerDashboardView
            user={user}
            clients={clients}
            permissions={permissions}
        />
    );
}
