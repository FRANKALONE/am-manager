'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { linkJiraUserForClient } from '@/app/actions/client-users';
import { useRouter } from 'next/navigation';

interface LinkDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    jiraUserId: string | null;
    appUserId: string | null;
    clientId: string;
    jiraUsers: Array<{
        id: string;
        displayName: string;
        emailAddress: string | null;
        linkedUser?: { id: string; name: string; email: string } | null;
    }>;
    appUsers: Array<{
        id: string;
        name: string;
        surname: string;
        email: string;
        linkedJiraCustomer?: { id: string; displayName: string; emailAddress: string } | null;
    }>;
    mode: 'jira-to-app' | 'app-to-jira';
}

export function LinkDialog({
    open,
    onOpenChange,
    jiraUserId,
    appUserId,
    clientId,
    jiraUsers,
    appUsers,
    mode
}: LinkDialogProps) {
    const router = useRouter();
    const [selectedJiraId, setSelectedJiraId] = useState<string>('');
    const [selectedAppId, setSelectedAppId] = useState<string>('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (mode === 'jira-to-app' && jiraUserId) {
            setSelectedJiraId(jiraUserId);
            setSelectedAppId('');
        } else if (mode === 'app-to-jira' && appUserId) {
            setSelectedAppId(appUserId);
            setSelectedJiraId('');
        }
    }, [mode, jiraUserId, appUserId, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedJiraId || !selectedAppId) {
            toast.error('Debes seleccionar ambos usuarios');
            return;
        }

        setLoading(true);

        try {
            const result = await linkJiraUserForClient(selectedJiraId, selectedAppId, clientId);

            if (result.success) {
                toast.success('Usuarios vinculados correctamente');
                setSelectedJiraId('');
                setSelectedAppId('');
                onOpenChange(false);
                router.refresh();
            } else {
                toast.error(result.error || 'Error al vincular usuarios');
            }
        } catch (error) {
            toast.error('Error al vincular usuarios');
        } finally {
            setLoading(false);
        }
    };

    const availableJiraUsers = jiraUsers.filter(u => !u.linkedUser);
    const availableAppUsers = appUsers.filter(u => !u.linkedJiraCustomer);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Vincular Usuarios</DialogTitle>
                    <DialogDescription>
                        Vincula un usuario de JIRA con un usuario de la aplicación existente.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="jiraUser">Usuario JIRA</Label>
                        <Select
                            value={selectedJiraId}
                            onValueChange={setSelectedJiraId}
                            disabled={mode === 'jira-to-app'}
                        >
                            <SelectTrigger id="jiraUser">
                                <SelectValue placeholder="Selecciona un usuario JIRA" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableJiraUsers.map((user) => (
                                    <SelectItem key={user.id} value={user.id}>
                                        {user.displayName} ({user.emailAddress || 'Sin email'})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="appUser">Usuario de la Aplicación</Label>
                        <Select
                            value={selectedAppId}
                            onValueChange={setSelectedAppId}
                            disabled={mode === 'app-to-jira'}
                        >
                            <SelectTrigger id="appUser">
                                <SelectValue placeholder="Selecciona un usuario de la app" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableAppUsers.map((user) => (
                                    <SelectItem key={user.id} value={user.id}>
                                        {user.name} {user.surname} ({user.email})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading || !selectedJiraId || !selectedAppId}>
                            {loading ? 'Vinculando...' : 'Vincular'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
