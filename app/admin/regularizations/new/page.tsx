import { getWorkPackagesForRegularization } from "@/app/actions/regularizations";
import { getUserById } from "@/app/actions/users";
import { RegularizationForm } from "../components/regularization-form";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function NewRegularizationPage() {
    const userId = cookies().get("user_id")?.value;
    if (!userId) redirect("/login");

    const user = await getUserById(userId);
    if (!user) redirect("/login");

    const workPackages = await getWorkPackagesForRegularization();

    return <RegularizationForm workPackages={workPackages} user={{ id: user.id, name: user.name, surname: user.surname || undefined }} />;
}
