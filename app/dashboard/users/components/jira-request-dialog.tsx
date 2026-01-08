'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { createJiraUserRequest } from '@/app/actions/jira-user-requests';
import { useRouter } from 'next/navigation';

interface JiraRequestDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    clientId: string;
    requestedBy: string;
    type: 'CREATE' | 'DELETE';
    jiraUserId?: string; // For DELETE
    jiraUserName?: string; // For DELETE
}

export function JiraRequestDialog({
    open,
    onOpenChange,
    clientId,
    requestedBy,
    type,
    jiraUserId,
    jiraUserName
}: JiraRequestDialogProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        displayName: '',
        reason: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const result = await createJiraUserRequest({
                clientId,
                requestedBy,
                type,
                email: type === 'CREATE' ? formData.email : undefined,
                displayName: type === 'CREATE' ? formData.displayName : undefined,
                jiraAccountId: type === 'DELETE' ? jiraUserId : undefined,
                reason: formData.reason
            });

            if (result.success) {
                toast.success('Solicitud enviada correctamente');
                setFormData({ email: '', displayName: '', reason: '' });
                onOpenChange(false);
                router.refresh();
            } else {
                toast.error(result.error || 'Error al enviar solicitud');
            }
        } catch (error) {
            toast.error('Error al enviar solicitud');
        } finally {
            setLoading(false);
        }
    };

    const isCreate = type === 'CREATE';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {isCreate ? 'Solicitar Nuevo Usuario JIRA' : 'Solicitar Eliminación de Usuario JIRA'}
                    </DialogTitle>
                    <DialogDescription>
                        {isCreate
                            ? 'Envía una solicitud para crear un nuevo usuario en el JIRA de tu organización.'
                            : `Solicita la eliminación del usuario "${jiraUserName}" de JIRA.`}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {isCreate && (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="displayName">Nombre Completo *</Label>
                                <Input
                                    id="displayName"
                                    value={formData.displayName}
                                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                    placeholder="Ej: Juan Pérez"
                                    required={isCreate}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email *</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="email@organizacion.com"
                                    required={isCreate}
                                />
                            </div>
                        </>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="reason">Motivo o Notas adicionales (opcional)</Label>
                        <Textarea
                            id="reason"
                            value={formData.reason}
                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                            placeholder={isCreate ? "¿Para qué proyecto se necesita?" : "¿Por qué debe eliminarse?"}
                            rows={3}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            variant={isCreate ? "default" : "destructive"}
                        >
                            {loading ? 'Enviando...' : 'Enviar Solicitud'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
