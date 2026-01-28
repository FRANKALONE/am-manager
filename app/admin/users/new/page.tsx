import { getClients } from "@/app/actions/clients";
import { getRoles } from "@/app/actions/roles";
import { getJiraEmployees } from "@/app/actions/client-users";
import { getCurrentUser } from "@/lib/auth";
import { UserForm } from "./user-form";

export default async function NewUserPage() {
    const clients = await getClients();
    const roles = await getRoles();
    const jiraResult = await getJiraEmployees();
    const jiraEmployees = jiraResult.success ? jiraResult.employees : [];
    const currentUser = await getCurrentUser();

    return (
        <UserForm
            clients={clients}
            roles={roles}
            workPackages={[]}
            jiraEmployees={jiraEmployees}
            currentUserRole={currentUser?.role}
        />
    );
}
