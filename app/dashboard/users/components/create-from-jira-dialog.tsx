'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { createAppUserFromJiraForClient } from '@/app/actions/client-users';
import { useRouter } from 'next/navigation';

interface CreateFromJiraDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    jiraUser: {
        id: string;
        displayName: string;
        emailAddress: string;
    } | null;
    clientId: string;
}

export function CreateFromJiraDialog({ open, onOpenChange, jiraUser, clientId }: CreateFromJiraDialogProps) {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!jiraUser) return;

        if (password.length < 6) {
            toast.error('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        if (password !== confirmPassword) {
            toast.error('Las contraseñas no coinciden');
            return;
        }

        setLoading(true);

        try {
            const result = await createAppUserFromJiraForClient(jiraUser.id, clientId, password);

            if (result.success) {
                toast.success('Usuario creado y vinculado correctamente');
                setPassword('');
                setConfirmPassword('');
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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Crear Usuario desde JIRA</DialogTitle>
                    <DialogDescription>
                        Se creará un nuevo usuario de la aplicación con rol CLIENTE y se vinculará automáticamente con el usuario de JIRA.
                    </DialogDescription>
                </DialogHeader>

                {jiraUser && (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nombre</Label>
                            <Input value={jiraUser.displayName} disabled />
                        </div>

                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input value={jiraUser.emailAddress} disabled />
                        </div>

                        <div className="space-y-2">
                            <Label>Rol</Label>
                            <Input value="CLIENTE" disabled />
                            <p className="text-xs text-gray-500">Solo se pueden crear usuarios con rol CLIENTE</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Contraseña *</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
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
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={6}
                                placeholder="Repite la contraseña"
                            />
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
                )}
            </DialogContent>
        </Dialog>
    );
}
