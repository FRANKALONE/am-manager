import { getSpecialRegularizationById } from "@/app/actions/special-regularizations";
import { SpecialRegularizationForm } from "../../components/regularization-form";
import { notFound } from "next/navigation";

export default async function EditSpecialRegularizationPage({
    params,
}: {
    params: { id: string };
}) {
    const regularization = await getSpecialRegularizationById(params.id);

    if (!regularization) {
        notFound();
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Editar Regularización Especial</h1>
                <p className="text-muted-foreground">
                    Modifica la configuración de la estrategia de regularización
                </p>
            </div>

            <SpecialRegularizationForm initialData={regularization} />
        </div>
    );
}
