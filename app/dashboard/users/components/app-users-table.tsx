'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trash2, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
import { deleteAppUserForClient } from '@/app/actions/client-users';
import { useRouter } from 'next/navigation';

interface AppUser {
    id: string;
    name: string;
    surname: string;
    email: string;
    role: string;
    linkedJiraCustomer?: {
        id: string;
        displayName: string;
        emailAddress: string;
    } | null;
}

interface AppUsersTableProps {
    users: AppUser[];
    clientId: string;
    isClientRole: boolean;
    onLinkClick: (userId: string) => void;
}

export function AppUsersTable({ users, clientId, isClientRole, onLinkClick }: AppUsersTableProps) {
    const router = useRouter();
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handleDelete = async (userId: string, userName: string) => {
        if (!confirm(`¿Estás seguro de que deseas eliminar al usuario ${userName}?`)) {
            return;
        }

        setDeletingId(userId);

        try {
            const result = await deleteAppUserForClient(userId, clientId);

            if (result.success) {
                toast.success('Usuario eliminado correctamente');
                router.refresh();
            } else {
                toast.error(result.error || 'Error al eliminar usuario');
            }
        } catch (error) {
            toast.error('Error al eliminar usuario');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="border rounded-lg">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Usuario JIRA</TableHead>
                        {isClientRole && <TableHead className="text-right">Acciones</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={isClientRole ? 5 : 4} className="text-center text-gray-500">
                                No hay usuarios registrados
                            </TableCell>
                        </TableRow>
                    ) : (
                        users.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell className="font-medium">
                                    {user.name} {user.surname}
                                </TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                    <Badge variant="outline">{user.role}</Badge>
                                </TableCell>
                                <TableCell>
                                    {user.linkedJiraCustomer ? (
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                                                Vinculado
                                            </Badge>
                                            <span className="text-sm text-gray-600">
                                                {user.linkedJiraCustomer.displayName}
                                            </span>
                                        </div>
                                    ) : (
                                        <Badge variant="outline" className="text-gray-500">
                                            No vinculado
                                        </Badge>
                                    )}
                                </TableCell>
                                {isClientRole && (
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {!user.linkedJiraCustomer && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => onLinkClick(user.id)}
                                                >
                                                    <LinkIcon className="h-4 w-4 mr-1" />
                                                    Vincular
                                                </Button>
                                            )}
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => handleDelete(user.id, `${user.name} ${user.surname}`)}
                                                disabled={deletingId === user.id}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
