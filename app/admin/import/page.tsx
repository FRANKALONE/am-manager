import { getKillSwitchStatus } from "@/app/actions/parameters";
import { ImportHistory } from "./components/import-history";
import { ImportManager } from "./components/import-manager";
import { BulkSyncManager } from "./components/bulk-sync-manager";
import { BulkSyncEvolutivosManager } from "./components/bulk-sync-evolutivos-manager";
import { BulkSyncProposalsManager } from "./components/bulk-sync-proposals-manager";
import { BulkSyncJiraCustomersManager } from "./components/bulk-sync-jira-customers-manager";
import { EvolutivosDiagnostic } from "./components/evolutivos-diagnostic";
import { WpSyncDiagnostic } from "./components/wp-sync-diagnostic";
import { SyncKillSwitch } from "../settings/components/sync-kill-switch";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "@/lib/get-translations";

export default async function ImportPage() {
    const { t } = await getTranslations();
    const killSwitchStatus = await getKillSwitchStatus();
    const clients = await prisma.client.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true }
    });

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t('import.title')}</h1>
                    <p className="text-muted-foreground">
                        {t('import.subtitle')}
                    </p>
                </div>
                <div className="w-80">
                    <SyncKillSwitch initialStatus={killSwitchStatus} />
                </div>
            </div>

            <BulkSyncManager />

            <BulkSyncEvolutivosManager />

            <BulkSyncProposalsManager />

            <BulkSyncJiraCustomersManager />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <EvolutivosDiagnostic clients={clients} />
                <WpSyncDiagnostic />
            </div>

            <ImportManager />

            {/* Historial de Importaciones */}
            <div className="px-4 pb-12">
                <ImportHistory />
            </div>
        </div>
    );
}
