import { getKillSwitchStatus } from "@/app/actions/parameters";
import { ImportHistory } from "./components/import-history";
import { ImportManager } from "./components/import-manager";
import { BulkSyncManager } from "./components/bulk-sync-manager";
import { BulkSyncEvolutivosManager } from "./components/bulk-sync-evolutivos-manager";
import { EvolutivosDiagnostic } from "./components/evolutivos-diagnostic";
import { SyncKillSwitch } from "../settings/components/sync-kill-switch";
import { prisma } from "@/lib/prisma";

export default async function ImportPage() {
    const killSwitchStatus = await getKillSwitchStatus();
    const clients = await prisma.client.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true }
    });

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Importación / Exportación</h1>
                    <p className="text-muted-foreground">
                        Gestión masiva de datos y control de sincronización.
                    </p>
                </div>
                <div className="w-80">
                    <SyncKillSwitch initialStatus={killSwitchStatus} />
                </div>
            </div>

            <BulkSyncManager />

            <BulkSyncEvolutivosManager />

            <EvolutivosDiagnostic clients={clients} />

            <ImportManager />

            {/* Historial de Importaciones */}
            <div className="px-4 pb-12">
                <ImportHistory />
            </div>
        </div>
    );
}
