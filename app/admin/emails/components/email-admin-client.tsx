"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmailSettingsForm } from "./email-settings-form";
import { EmailLogsTable } from "./email-logs-table";
import { useTranslations } from "@/lib/use-translations";

interface EmailAdminClientProps {
    settings: Record<string, string>;
    logs: any[];
}

export function EmailAdminClient({ settings, logs }: EmailAdminClientProps) {
    const { t } = useTranslations();
    const [activeTab, setActiveTab] = useState<'settings' | 'logs'>('settings');

    return (
        <Tabs defaultValue="settings" className="space-y-4">
            <TabsList>
                <TabsTrigger
                    value="settings"
                    active={activeTab === 'settings'}
                    onClick={() => setActiveTab('settings')}
                >
                    {t('admin.emails.tabs.settings')}
                </TabsTrigger>
                <TabsTrigger
                    value="logs"
                    active={activeTab === 'logs'}
                    onClick={() => setActiveTab('logs')}
                >
                    {t('admin.emails.tabs.logs')}
                </TabsTrigger>
            </TabsList>

            <TabsContent value="settings" active={activeTab === 'settings'}>
                <Card>
                    <CardHeader>
                        <CardTitle>{t('admin.emails.settings.title')}</CardTitle>
                        <CardDescription>
                            {t('admin.emails.settings.description')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <EmailSettingsForm initialSettings={settings} />
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="logs" active={activeTab === 'logs'}>
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>{t('admin.emails.logs.title')}</CardTitle>
                                <CardDescription>
                                    {t('admin.emails.logs.description')}
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
    );
}
