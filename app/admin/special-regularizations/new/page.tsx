import { SpecialRegularizationForm } from "../components/regularization-form";

export default function NewSpecialRegularizationPage() {
    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Nueva Regularización Especial</h1>
                <p className="text-muted-foreground">
                    Configura una estrategia de regularización reutilizable
                </p>
            </div>

            <SpecialRegularizationForm />
        </div>
    );
}
