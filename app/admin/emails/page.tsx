import { getEmailLogs, getEmailSettings } from "@/app/actions/email-admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmailSettingsForm } from "./components/email-settings-form";
import { EmailLogsTable } from "./components/email-logs-table";
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

            <Tabs defaultValue="settings" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="settings">Configuración</TabsTrigger>
                    <TabsTrigger value="logs">Logs de Envío</TabsTrigger>
                </TabsList>

                <TabsContent value="settings">
                    <Card>
                        <CardHeader>
                            <CardTitle>Configuración SMTP y Redirección</CardTitle>
                            <CardDescription>
                                Los valores guardados aquí prevalecen sobre el archivo .env
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <EmailSettingsForm initialSettings={settings} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="logs">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle>Historial de Envíos</CardTitle>
                                    <CardDescription>
                                        Últimos 50 correos electrónicos intentados desde la aplicación.
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <EmailLogsTable logs={logs} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
