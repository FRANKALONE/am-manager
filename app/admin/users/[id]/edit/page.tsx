import { getUserById } from "@/app/actions/users";
import { getClients } from "@/app/actions/clients";
import { getRoles } from "@/app/actions/roles";
import { getWorkPackages } from "@/app/actions/work-packages";
import { getJiraEmployees } from "@/app/actions/client-users";
import { getCurrentUser } from "@/lib/auth";
import { UserForm } from "../../new/user-form";
import { notFound } from "next/navigation";

export default async function EditUserPage({ params }: { params: { id: string } }) {
    const userResult = await getUserById(params.id);
    const clients = await getClients();
    const roles = await getRoles();
    const wps = await getWorkPackages();
    const jiraResult = await getJiraEmployees();
    const jiraEmployees = jiraResult.success ? jiraResult.employees : [];
    const currentUser = await getCurrentUser();

    if (!userResult) {
        notFound();
    }

    return (
        <UserForm
            clients={clients}
            roles={roles}
            workPackages={wps}
            jiraEmployees={jiraEmployees}
            initialUser={userResult}
            currentUserRole={currentUser?.role}
        />
    );
}
