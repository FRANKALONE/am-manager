import { DatabaseMaintenance } from "../settings/components/database-maintenance";

export default function MaintenancePage() {
    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Manteinimiento de BBDD</h1>
                <p className="text-muted-foreground">
                    Herramientas para la gestión técnica y limpieza de datos.
                </p>
            </div>

            <DatabaseMaintenance />
        </div>
    );
}
