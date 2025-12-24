import { getUserById } from "@/app/actions/users";
import { getClients } from "@/app/actions/clients";
import { getRoles } from "@/app/actions/roles";
import { getWorkPackages } from "@/app/actions/work-packages";
import { UserForm } from "../../new/user-form";
import { notFound } from "next/navigation";

export default async function EditUserPage({ params }: { params: { id: string } }) {
    const user = await getUserById(params.id);
    const clients = await getClients();
    const roles = await getRoles();
    const wps = await getWorkPackages();

    if (!user) {
        notFound();
    }

    return (
        <UserForm
            clients={clients}
            roles={roles}
            workPackages={wps}
            initialUser={user}
        />
    );
}
