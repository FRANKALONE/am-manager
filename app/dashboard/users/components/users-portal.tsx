'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPlus } from 'lucide-react';
import { AppUsersTable } from './app-users-table';
import { JiraUsersPanel } from './jira-users-panel';
import { CreateFromJiraDialog } from './create-from-jira-dialog';
import { LinkDialog } from './link-dialog';
import { NewUserDialog } from './new-user-dialog';

interface UsersPortalProps {
    appUsers: any[];
    jiraUsers: any[];
    clientId: string;
    isClientRole: boolean;
}

export function UsersPortal({ appUsers, jiraUsers, clientId, isClientRole }: UsersPortalProps) {
    const [activeTab, setActiveTab] = useState<'app' | 'jira'>('app');
    const [createFromJiraOpen, setCreateFromJiraOpen] = useState(false);
    const [linkDialogOpen, setLinkDialogOpen] = useState(false);
    const [newUserOpen, setNewUserOpen] = useState(false);
    const [selectedJiraUser, setSelectedJiraUser] = useState<any>(null);
    const [selectedAppUserId, setSelectedAppUserId] = useState<string | null>(null);
    const [selectedJiraUserId, setSelectedJiraUserId] = useState<string | null>(null);
    const [linkMode, setLinkMode] = useState<'jira-to-app' | 'app-to-jira'>('jira-to-app');

    const handleCreateFromJira = (jiraUserId: string) => {
        const user = jiraUsers.find(u => u.id === jiraUserId);
        if (user) {
            setSelectedJiraUser(user);
            setCreateFromJiraOpen(true);
        }
    };

    const handleLinkFromJira = (jiraUserId: string) => {
        setSelectedJiraUserId(jiraUserId);
        setSelectedAppUserId(null);
        setLinkMode('jira-to-app');
        setLinkDialogOpen(true);
    };

    const handleLinkFromApp = (appUserId: string) => {
        setSelectedAppUserId(appUserId);
        setSelectedJiraUserId(null);
        setLinkMode('app-to-jira');
        setLinkDialogOpen(true);
    };

    return (
        <>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
                        <p className="text-gray-600 mt-1">
                            {isClientRole
                                ? 'Gestiona los usuarios de tu organización'
                                : 'Visualiza los usuarios de tu organización'}
                        </p>
                    </div>
                    {isClientRole && (
                        <Button onClick={() => setNewUserOpen(true)}>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Nuevo Usuario
                        </Button>
                    )}
                </div>

                <Tabs className="space-y-4">
                    <TabsList>
                        <TabsTrigger
                            value="app"
                            active={activeTab === 'app'}
                            onClick={() => setActiveTab('app')}
                        >
                            Usuarios de la Aplicación ({appUsers.length})
                        </TabsTrigger>
                        <TabsTrigger
                            value="jira"
                            active={activeTab === 'jira'}
                            onClick={() => setActiveTab('jira')}
                        >
                            Usuarios de JIRA ({jiraUsers.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="app" active={activeTab === 'app'} className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Usuarios de la Aplicación</CardTitle>
                                <CardDescription>
                                    Usuarios registrados en la aplicación de tu organización
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <AppUsersTable
                                    users={appUsers}
                                    clientId={clientId}
                                    isClientRole={isClientRole}
                                    onLinkClick={handleLinkFromApp}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="jira" active={activeTab === 'jira'} className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Usuarios de JIRA</CardTitle>
                                <CardDescription>
                                    Usuarios sincronizados desde JIRA Service Management
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <JiraUsersPanel
                                    users={jiraUsers}
                                    isClientRole={isClientRole}
                                    onCreateFromJira={handleCreateFromJira}
                                    onLinkToApp={handleLinkFromJira}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Diálogos */}
            <CreateFromJiraDialog
                open={createFromJiraOpen}
                onOpenChange={setCreateFromJiraOpen}
                jiraUser={selectedJiraUser}
                clientId={clientId}
            />

            <LinkDialog
                open={linkDialogOpen}
                onOpenChange={setLinkDialogOpen}
                jiraUserId={selectedJiraUserId}
                appUserId={selectedAppUserId}
                clientId={clientId}
                jiraUsers={jiraUsers}
                appUsers={appUsers}
                mode={linkMode}
            />

            <NewUserDialog
                open={newUserOpen}
                onOpenChange={setNewUserOpen}
                clientId={clientId}
                jiraUsers={jiraUsers}
            />
        </>
    );
}
