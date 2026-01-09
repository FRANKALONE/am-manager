import { getEmailLogs, getEmailSettings } from "@/app/actions/email-admin";
import { EmailAdminClient } from "./components/email-admin-client";
import { getTranslations } from "@/lib/get-translations";

export default async function EmailAdminPage() {
    const { t } = await getTranslations();
    const settings = await getEmailSettings();
    const logs = await getEmailLogs();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{t('admin.emails.title')}</h1>
                <p className="text-muted-foreground">
                    {t('admin.emails.subtitle')}
                </p>
            </div>

            <EmailAdminClient settings={settings} logs={logs} />
        </div>
    );
}
