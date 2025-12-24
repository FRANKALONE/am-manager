import { getClients } from "@/app/actions/clients";
import { getRoles } from "@/app/actions/roles";
import { UserForm } from "./user-form";

export default async function NewUserPage() {
    const clients = await getClients();
    const roles = await getRoles();

    return <UserForm clients={clients} roles={roles} workPackages={[]} />;
}
