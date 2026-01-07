'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { createAppUserFromJiraUser } from '@/app/actions/jira-customers';
import { toast } from 'sonner';

interface CreateUserDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    jiraUser: {
        id: string;
        displayName: string;
        emailAddress: string | null;
        client: { id: string; name: string };
    };
}

export function CreateUserDialog({ open, onOpenChange, jiraUser }: CreateUserDialogProps) {
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('CLIENTE');
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
        if (!password) {
            toast.error('Introduce una contraseña');
            return;
        }

        if (!jiraUser.emailAddress) {
            toast.error('El usuario JIRA no tiene email configurado');
            return;
        }

        setLoading(true);
        const result = await createAppUserFromJiraUser(jiraUser.id, {
            password,
            role,
        });

        if (result.success) {
            toast.success('Usuario creado y vinculado correctamente');
            onOpenChange(false);
            setPassword('');
        } else {
            toast.error(result.error || 'Error al crear usuario');
        }
        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Crear Usuario desde JIRA</DialogTitle>
                    <DialogDescription>
                        Crea un nuevo usuario en la aplicación basado en el usuario de JIRA
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Datos de JIRA</Label>
                        <div className="p-3 bg-gray-50 rounded-md space-y-1">
                            <div className="font-medium">{jiraUser.displayName}</div>
                            <div className="text-sm text-gray-600">{jiraUser.emailAddress || 'Sin email'}</div>
                            <div className="text-sm text-gray-500">{jiraUser.client.name}</div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Contraseña Temporal *</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Contraseña temporal"
                        />
                        <p className="text-xs text-gray-500">
                            El usuario deberá cambiarla en el primer inicio de sesión
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="role">Rol *</Label>
                        <Select value={role} onValueChange={setRole}>
                            <SelectTrigger id="role">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="CLIENTE">Cliente</SelectItem>
                                <SelectItem value="MANAGER">Manager</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button onClick={handleCreate} disabled={loading || !password}>
                        {loading ? 'Creando...' : 'Crear Usuario'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
