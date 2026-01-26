import { getClients } from "@/app/actions/clients";
import { getRoles } from "@/app/actions/roles";
import { getJiraEmployees } from "@/app/actions/client-users";
import { UserForm } from "./user-form";

export default async function NewUserPage() {
    const clients = await getClients();
    const roles = await getRoles();
    const jiraResult = await getJiraEmployees();
    const jiraEmployees = jiraResult.success ? jiraResult.employees : [];

    return (
        <UserForm
            clients={clients}
            roles={roles}
            workPackages={[]}
            jiraEmployees={jiraEmployees}
        />
    );
}
