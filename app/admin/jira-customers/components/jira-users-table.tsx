'use client';

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Link2, UserPlus, Unlink } from 'lucide-react';
import { SyncButton } from './sync-button';
import { LinkUserDialog } from './link-user-dialog';
import { CreateUserDialog } from './create-user-dialog';
import { unlinkJiraUser } from '@/app/actions/jira-customers';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface JiraUser {
    id: string;
    accountId: string;
    displayName: string;
    emailAddress: string | null;
    active: boolean;
    client: { id: string; name: string };
    organization: { id: string; name: string };
    linkedUser: { id: string; name: string; email: string } | null;
    lastSyncAt: Date | null;
}

interface JiraUsersTableProps {
    users: JiraUser[];
}

export function JiraUsersTable({ users }: JiraUsersTableProps) {
    const [search, setSearch] = useState('');
    const [clientFilter, setClientFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [linkFilter, setLinkFilter] = useState('all');
    const [selectedUser, setSelectedUser] = useState<JiraUser | null>(null);
    const [showLinkDialog, setShowLinkDialog] = useState(false);
    const [showCreateDialog, setShowCreateDialog] = useState(false);

    // Obtener lista única de clientes
    const clients = useMemo(() => {
        const uniqueClients = new Map();
        users.forEach(user => {
            if (!uniqueClients.has(user.client.id)) {
                uniqueClients.set(user.client.id, user.client);
            }
        });
        return Array.from(uniqueClients.values());
    }, [users]);

    // Filtrar usuarios
    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            // Filtro de búsqueda
            if (search) {
                const searchLower = search.toLowerCase();
                const matchesSearch =
                    user.displayName.toLowerCase().includes(searchLower) ||
                    user.emailAddress?.toLowerCase().includes(searchLower) ||
                    user.client.name.toLowerCase().includes(searchLower);
                if (!matchesSearch) return false;
            }

            // Filtro de cliente
            if (clientFilter !== 'all' && user.client.id !== clientFilter) {
                return false;
            }

            // Filtro de estado
            if (statusFilter === 'active' && !user.active) return false;
            if (statusFilter === 'inactive' && user.active) return false;

            // Filtro de vinculación
            if (linkFilter === 'linked' && !user.linkedUser) return false;
            if (linkFilter === 'unlinked' && user.linkedUser) return false;

            return true;
        });
    }, [users, search, clientFilter, statusFilter, linkFilter]);

    const handleUnlink = async (userId: string) => {
        const result = await unlinkJiraUser(userId);
        if (result.success) {
            toast.success('Usuario desvinculado');
        } else {
            toast.error(result.error || 'Error al desvincular');
        }
    };

    return (
        <div className="space-y-4">
            {/* Filtros */}
            <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Buscar por nombre, email o cliente..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>

                <Select value={clientFilter} onValueChange={setClientFilter}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Todos los clientes" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los clientes</SelectItem>
                        {clients.map(client => (
                            <SelectItem key={client.id} value={client.id}>
                                {client.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="active">Activos</SelectItem>
                        <SelectItem value="inactive">Inactivos</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={linkFilter} onValueChange={setLinkFilter}>
                    <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Vinculación" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="linked">Vinculados</SelectItem>
                        <SelectItem value="unlinked">No vinculados</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Tabla */}
            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Usuario</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Organización</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Usuario Vinculado</TableHead>
                            <TableHead>Última Sync</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredUsers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                                    No se encontraron usuarios
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredUsers.map(user => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">{user.displayName}</TableCell>
                                    <TableCell>{user.emailAddress || '-'}</TableCell>
                                    <TableCell>{user.client.name}</TableCell>
                                    <TableCell className="text-sm text-gray-600">
                                        {user.organization.name}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={user.active ? 'default' : 'secondary'}>
                                            {user.active ? 'Activo' : 'Inactivo'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {user.linkedUser ? (
                                            <div className="text-sm">
                                                <div className="font-medium">{user.linkedUser.name}</div>
                                                <div className="text-gray-500">{user.linkedUser.email}</div>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400">No vinculado</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-sm text-gray-600">
                                        {user.lastSyncAt ? format(new Date(user.lastSyncAt), 'dd/MM/yyyy HH:mm') : '-'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <SyncButton clientId={user.client.id} clientName={user.client.name} />

                                            {!user.linkedUser ? (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setSelectedUser(user);
                                                            setShowLinkDialog(true);
                                                        }}
                                                    >
                                                        <Link2 className="h-4 w-4 mr-1" />
                                                        Vincular
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedUser(user);
                                                            setShowCreateDialog(true);
                                                        }}
                                                    >
                                                        <UserPlus className="h-4 w-4 mr-1" />
                                                        Crear
                                                    </Button>
                                                </>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleUnlink(user.id)}
                                                >
                                                    <Unlink className="h-4 w-4 mr-1" />
                                                    Desvincular
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="text-sm text-gray-600">
                Mostrando {filteredUsers.length} de {users.length} usuarios
            </div>

            {/* Diálogos */}
            {selectedUser && (
                <>
                    <LinkUserDialog
                        open={showLinkDialog}
                        onOpenChange={setShowLinkDialog}
                        jiraUser={selectedUser}
                    />
                    <CreateUserDialog
                        open={showCreateDialog}
                        onOpenChange={setShowCreateDialog}
                        jiraUser={selectedUser}
                    />
                </>
            )}
        </div>
    );
}
