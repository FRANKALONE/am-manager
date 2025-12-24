import { SharedHeader } from "@/app/components/shared-header";
import { CierresView } from "./components/cierres-view";

export default function CierresPage() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <SharedHeader title="Gestión de Cierres" />

            <div className="max-w-6xl mx-auto px-4 py-8 md:px-8">
                <div className="mb-8">
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Gestión de Cierres</h2>
                    <p className="text-slate-500 mt-1">Identifica y factura excesos de consumo de tus clientes.</p>
                </div>

                <CierresView />
            </div>
        </div>
    );
}
