import { DatabaseMaintenance } from "../settings/components/database-maintenance";
import { getTranslations } from "@/lib/get-translations";

export default async function MaintenancePage() {
    const { t } = await getTranslations();

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{t('admin.maintenance.title')}</h1>
                <p className="text-muted-foreground">
                    {t('admin.maintenance.subtitle')}
                </p>
            </div>

            <DatabaseMaintenance />
        </div>
    );
}
