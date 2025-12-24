import { getRoleById } from "@/app/actions/roles";
import { RoleForm } from "../../components/role-form";
import { notFound } from "next/navigation";

export default async function EditRolePage({ params }: { params: { id: string } }) {
    const role = await getRoleById(params.id);

    if (!role) {
        notFound();
    }

    return (
        <div className="p-8">
            <RoleForm initialRole={role} />
        </div>
    );
}
