'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { linkJiraUserToAppUser } from '@/app/actions/jira-customers';
import { toast } from 'sonner';
import { prisma } from '@/lib/prisma';

interface LinkUserDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    jiraUser: {
        id: string;
        displayName: string;
        emailAddress: string | null;
        client: { id: string; name: string };
    };
}

export function LinkUserDialog({ open, onOpenChange, jiraUser }: LinkUserDialogProps) {
    const [selectedUserId, setSelectedUserId] = useState('');
    const [loading, setLoading] = useState(false);
    const [appUsers, setAppUsers] = useState<any[]>([]);

    useEffect(() => {
        if (open) {
            // Cargar usuarios del cliente
            fetch(`/api/users?clientId=${jiraUser.client.id}`)
                .then(res => res.json())
                .then(data => setAppUsers(data.users || []))
                .catch(() => toast.error('Error al cargar usuarios'));
        }
    }, [open, jiraUser.client.id]);

    const handleLink = async () => {
        if (!selectedUserId) {
            toast.error('Selecciona un usuario');
            return;
        }

        setLoading(true);
        const result = await linkJiraUserToAppUser(jiraUser.id, selectedUserId);

        if (result.success) {
            toast.success('Usuario vinculado correctamente');
            onOpenChange(false);
        } else {
            toast.error(result.error || 'Error al vincular');
        }
        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Vincular Usuario JIRA</DialogTitle>
                    <DialogDescription>
                        Vincula el usuario de JIRA con un usuario existente de la aplicación
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Usuario JIRA</Label>
                        <div className="p-3 bg-gray-50 rounded-md">
                            <div className="font-medium">{jiraUser.displayName}</div>
                            <div className="text-sm text-gray-600">{jiraUser.emailAddress || 'Sin email'}</div>
                            <div className="text-sm text-gray-500">{jiraUser.client.name}</div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="app-user">Usuario de la Aplicación</Label>
                        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                            <SelectTrigger id="app-user">
                                <SelectValue placeholder="Selecciona un usuario" />
                            </SelectTrigger>
                            <SelectContent>
                                {appUsers.map(user => (
                                    <SelectItem key={user.id} value={user.id}>
                                        {user.name} {user.surname} ({user.email})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button onClick={handleLink} disabled={loading || !selectedUserId}>
                        {loading ? 'Vinculando...' : 'Vincular'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
