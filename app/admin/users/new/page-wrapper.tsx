import { getClients } from "@/app/actions/clients";
import { getRoles } from "@/app/actions/roles";
import { getWorkPackages } from "@/app/actions/work-packages";
import { UserForm } from "./user-form";

export default async function NewUserPage() {
    const clients = await getClients();
    const roles = await getRoles();
    const workPackages = await getWorkPackages();

    return <UserForm clients={clients} roles={roles} workPackages={workPackages} />;
}
