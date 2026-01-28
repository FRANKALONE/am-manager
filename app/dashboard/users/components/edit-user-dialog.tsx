'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { updateAppUserForClient } from '@/app/actions/client-users';
import { useRouter } from 'next/navigation';

interface EditUserDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    clientId: string;
    user: {
        id: string;
        name: string;
        surname: string | null;
        email: string;
        linkedJiraCustomer?: { jiraCustomerId: string } | null;
    };
    jiraUsers: Array<{
        id: string;
        displayName: string;
        emailAddress: string | null;
        linkedUser?: { id: string; name: string; email: string } | null;
    }>;
}

export function EditUserDialog({ open, onOpenChange, clientId, user, jiraUsers }: EditUserDialogProps) {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: user.name,
        surname: user.surname || '',
        email: user.email,
        password: '',
        confirmPassword: '',
        jiraUserId: user.linkedJiraCustomer?.jiraCustomerId || ''
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setFormData({
            name: user.name,
            surname: user.surname || '',
            email: user.email,
            password: '',
            confirmPassword: '',
            jiraUserId: user.linkedJiraCustomer?.jiraCustomerId || ''
        });
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password && formData.password.length < 6) {
            toast.error('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            toast.error('Las contraseñas no coinciden');
            return;
        }

        setLoading(true);

        try {
            const result = await updateAppUserForClient(clientId, user.id, {
                name: formData.name,
                surname: formData.surname,
                email: formData.email,
                password: formData.password || undefined,
                jiraUserId: formData.jiraUserId || undefined
            });

            if (result.success) {
                toast.success('Usuario actualizado correctamente');
                onOpenChange(false);
                router.refresh();
            } else {
                toast.error(result.error || 'Error al actualizar usuario');
            }
        } catch (error) {
            toast.error('Error al actualizar usuario');
        } finally {
            setLoading(false);
        }
    };

    const availableJiraUsers = (jiraUsers || []).filter(u =>
        !u.linkedUser || u.linkedUser.id === user.id
    ).filter(u => u.emailAddress);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Editar Usuario</DialogTitle>
                    <DialogDescription>
                        Actualiza la información del usuario.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nombre *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="surname">Apellidos *</Label>
                            <Input
                                id="surname"
                                value={formData.surname}
                                onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Nueva Contraseña (opcional)</Label>
                        <Input
                            id="password"
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            minLength={6}
                            placeholder="Dejar en blanco para no cambiar"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            minLength={6}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="jiraUser">Vincular con usuario JIRA (opcional)</Label>
                        <Select
                            value={formData.jiraUserId || 'none'}
                            onValueChange={(value) => setFormData({ ...formData, jiraUserId: value === 'none' ? '' : value })}
                        >
                            <SelectTrigger id="jiraUser">
                                <SelectValue placeholder="Sin vincular" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Sin vincular</SelectItem>
                                {availableJiraUsers.map((user) => (
                                    <SelectItem key={user.id} value={user.id}>
                                        {user.displayName} ({user.emailAddress})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Actualizando...' : 'Actualizar Usuario'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
