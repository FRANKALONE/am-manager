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
                <h1 className="text-3xl font-bold tracking-tight">Gestión de Emails</h1>
                <p className="text-muted-foreground">
                    Configura el servidor de correo y consulta el historial de envíos.
                </p>
            </div>

            <EmailAdminClient settings={settings} logs={logs} t={t} />
        </div>
    );
}
