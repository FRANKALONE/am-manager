import { getRegularization, getWorkPackagesForRegularization } from "@/app/actions/regularizations";
import { RegularizationEditForm } from "./components/edit-form";
import { notFound } from "next/navigation";

export default async function EditRegularizationPage({ params }: { params: { id: string } }) {
    const id = parseInt(params.id);
    const [regularization, workPackages] = await Promise.all([
        getRegularization(id),
        getWorkPackagesForRegularization()
    ]);

    if (!regularization) {
        notFound();
    }

    return <RegularizationEditForm regularization={regularization} workPackages={workPackages} />;
}
