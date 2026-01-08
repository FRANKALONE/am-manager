'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Link as LinkIcon } from 'lucide-react';

interface JiraUser {
    id: string;
    displayName: string;
    emailAddress: string | null;
    active: boolean;
    organization: {
        id: string;
        name: string;
    };
    linkedUser?: {
        id: string;
        name: string;
        email: string;
    } | null;
}

interface JiraUsersPanelProps {
    users: JiraUser[];
    isClientRole: boolean;
    onCreateFromJira: (jiraUserId: string) => void;
    onLinkToApp: (jiraUserId: string) => void;
    onDeleteRequest?: (jiraUserId: string) => void;
}

export function JiraUsersPanel({ users, isClientRole, onCreateFromJira, onLinkToApp, onDeleteRequest }: JiraUsersPanelProps) {
    return (
        <div className="border rounded-lg">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Organización</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Usuario App</TableHead>
                        {isClientRole && <TableHead className="text-right">Acciones</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={isClientRole ? 6 : 5} className="text-center text-gray-500">
                                No hay usuarios JIRA sincronizados
                            </TableCell>
                        </TableRow>
                    ) : (
                        users.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell className="font-medium">{user.displayName}</TableCell>
                                <TableCell>{user.emailAddress || 'Sin email'}</TableCell>
                                <TableCell className="text-sm text-gray-600">{user.organization.name}</TableCell>
                                <TableCell>
                                    <Badge
                                        variant={user.active ? 'default' : 'secondary'}
                                        className={user.active ? 'bg-green-100 text-green-800' : ''}
                                    >
                                        {user.active ? 'Activo' : 'Inactivo'}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {user.linkedUser ? (
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                                Vinculado
                                            </Badge>
                                            <span className="text-sm text-gray-600">
                                                {user.linkedUser.name}
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
                                        {!user.linkedUser && user.emailAddress && (
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => onLinkToApp(user.id)}
                                                >
                                                    <LinkIcon className="h-4 w-4 mr-1" />
                                                    Vincular
                                                </Button>
                                                <Button
                                                    variant="default"
                                                    size="sm"
                                                    onClick={() => onCreateFromJira(user.id)}
                                                >
                                                    <UserPlus className="h-4 w-4 mr-1" />
                                                    Crear Usuario
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => {
                                                        if (confirm('¿Estás seguro de que quieres solicitar la eliminación de este usuario de JIRA?')) {
                                                            onDeleteRequest?.(user.id);
                                                        }
                                                    }}
                                                >
                                                    Solicitar Eliminación
                                                </Button>
                                            </div>
                                        )}
                                        {user.linkedUser && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => {
                                                    if (confirm('¿Estás seguro de que quieres solicitar la eliminación de este usuario de JIRA?')) {
                                                        onDeleteRequest?.(user.id);
                                                    }
                                                }}
                                            >
                                                Solicitar Eliminación
                                            </Button>
                                        )}
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
