'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { createAppUserForClient } from '@/app/actions/client-users';
import { useRouter } from 'next/navigation';

interface NewUserDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    clientId: string;
    jiraUsers: Array<{
        id: string;
        displayName: string;
        emailAddress: string | null;
        linkedUser?: { id: string; name: string; email: string } | null;
    }>;
}

export function NewUserDialog({ open, onOpenChange, clientId, jiraUsers }: NewUserDialogProps) {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: '',
        surname: '',
        email: '',
        password: '',
        confirmPassword: '',
        jiraUserId: ''
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password.length < 6) {
            toast.error('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            toast.error('Las contraseñas no coinciden');
            return;
        }

        setLoading(true);

        try {
            const result = await createAppUserForClient(clientId, {
                name: formData.name,
                surname: formData.surname,
                email: formData.email,
                password: formData.password,
                jiraUserId: formData.jiraUserId || undefined
            });

            if (result.success) {
                toast.success('Usuario creado correctamente');
                setFormData({
                    name: '',
                    surname: '',
                    email: '',
                    password: '',
                    confirmPassword: '',
                    jiraUserId: ''
                });
                onOpenChange(false);
                router.refresh();
            } else {
                toast.error(result.error || 'Error al crear usuario');
            }
        } catch (error) {
            toast.error('Error al crear usuario');
        } finally {
            setLoading(false);
        }
    };

    const availableJiraUsers = jiraUsers.filter(u => !u.linkedUser && u.emailAddress);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Nuevo Usuario</DialogTitle>
                    <DialogDescription>
                        Crea un nuevo usuario de la aplicación con rol CLIENTE.
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
                        <Label htmlFor="password">Contraseña *</Label>
                        <Input
                            id="password"
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                            minLength={6}
                            placeholder="Mínimo 6 caracteres"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirmar Contraseña *</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            required
                            minLength={6}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="jiraUser">Vincular con usuario JIRA (opcional)</Label>
                        <Select
                            value={formData.jiraUserId}
                            onValueChange={(value) => setFormData({ ...formData, jiraUserId: value })}
                        >
                            <SelectTrigger id="jiraUser">
                                <SelectValue placeholder="Sin vincular" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">Sin vincular</SelectItem>
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
                            {loading ? 'Creando...' : 'Crear Usuario'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
