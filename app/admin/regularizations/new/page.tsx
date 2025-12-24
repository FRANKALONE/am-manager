import { getWorkPackagesForRegularization } from "@/app/actions/regularizations";
import { RegularizationForm } from "../components/regularization-form";

export default async function NewRegularizationPage() {
    const workPackages = await getWorkPackagesForRegularization();

    return <RegularizationForm workPackages={workPackages} />;
}
