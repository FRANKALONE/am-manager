'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, X, Info } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { handleJiraUserRequest } from '@/app/actions/jira-user-requests';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface JiraRequestsTableProps {
    pendingRequests: any[];
    historyRequests: any[];
    currentUserId: string;
}

export function JiraRequestsTable({ pendingRequests, historyRequests, currentUserId }: JiraRequestsTableProps) {
    const router = useRouter();
    const [loading, setLoading] = useState<string | null>(null);
    const [debugData, setDebugData] = useState(false);
    const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

    console.log("[JiraRequestsTable] Props:", { pendingRequests, historyRequests });

    const onHandleRequest = async (id: string, status: 'APPROVED' | 'REJECTED') => {
        const notes = prompt(status === 'APPROVED' ? 'Notas de aprobación (opcional):' : 'Motivo del rechazo (obligatorio):');

        if (status === 'REJECTED' && !notes) {
            toast.error('Debes indicar un motivo para el rechazo');
            return;
        }

        setLoading(id);
        try {
            const result = await handleJiraUserRequest(id, currentUserId, status, notes || undefined);
            if (result.success) {
                toast.success(status === 'APPROVED' ? 'Solicitud aprobada' : 'Solicitud rechazada');
                router.refresh();
            } else {
                toast.error(result.error || 'Error al procesar la solicitud');
            }
        } catch (error) {
            toast.error('Error al procesar la solicitud');
        } finally {
            setLoading(null);
        }
    };

    const renderTable = (requests: any[], isHistory: boolean) => (
        <div className="border rounded-lg overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Solicitante</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Detalle</TableHead>
                        <TableHead>Estado</TableHead>
                        {!isHistory && <TableHead className="text-right">Acciones</TableHead>}
                        {isHistory && <TableHead>Revisado por</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {requests.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={isHistory ? 7 : 7} className="text-center py-8 text-gray-500">
                                No hay solicitudes que mostrar
                            </TableCell>
                        </TableRow>
                    ) : (
                        requests.map((request) => (
                            <TableRow key={request.id}>
                                <TableCell className="whitespace-nowrap">
                                    {request.createdAt ? format(new Date(request.createdAt), 'dd MMM yyyy HH:mm', { locale: es }) : '---'}
                                </TableCell>
                                <TableCell className="font-medium">{request.client?.name || 'Cliente desconocido'}</TableCell>
                                <TableCell>
                                    {request.requestedByUser ? `${request.requestedByUser.name} ${request.requestedByUser.surname || ''}` : 'Usuario desconocido'}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={request.type === 'CREATE' ? 'default' : 'destructive'} className="text-[10px]">
                                        {request.type === 'CREATE' ? 'CREACIÓN' : 'ELIMINACIÓN'}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col gap-1 max-w-[250px]">
                                        <span className="font-semibold text-sm truncate">
                                            {request.displayName || request.email || request.jiraAccountId}
                                        </span>
                                        {request.reason && (
                                            <span className="text-xs text-gray-500 italic line-clamp-2">
                                                "{request.reason}"
                                            </span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge
                                        variant="outline"
                                        className={
                                            request.status === 'PENDING' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                request.status === 'APPROVED' ? 'bg-green-50 text-green-700 border-green-200' :
                                                    'bg-red-50 text-red-700 border-red-200'
                                        }
                                    >
                                        {request.status === 'PENDING' ? 'Pendiente' : request.status === 'APPROVED' ? 'Aprobada' : 'Rechazada'}
                                    </Badge>
                                </TableCell>
                                {!isHistory && (
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => onHandleRequest(request.id, 'REJECTED')}
                                                disabled={!!loading}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="default"
                                                size="sm"
                                                className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700"
                                                onClick={() => onHandleRequest(request.id, 'APPROVED')}
                                                disabled={!!loading}
                                            >
                                                <Check className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                )}
                                {isHistory && (
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-sm">
                                                {request.reviewedByUser ? `${request.reviewedByUser.name} ${request.reviewedByUser.surname || ''}` : '---'}
                                            </span>
                                            {request.reviewNotes && (
                                                <span className="text-[10px] text-gray-500 italic truncate max-w-[150px]">
                                                    {request.reviewNotes}
                                                </span>
                                            )}
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

    return (
        <Tabs defaultValue="pending" className="w-full">
            <div className="flex justify-end mb-2">
                <Button variant="ghost" size="sm" onClick={() => setDebugData(!debugData)} className="text-[10px] text-gray-400">
                    {debugData ? 'Ocultar Debug' : 'Mostrar Debug'}
                </Button>
            </div>
            {debugData && (
                <pre className="bg-gray-100 p-2 rounded text-[10px] overflow-auto max-h-40 mb-4">
                    {JSON.stringify({ pendingRequests, historyRequests }, null, 2)}
                </pre>
            )}
            <TabsList className="mb-4">
                <TabsTrigger
                    value="pending"
                    active={activeTab === 'pending'}
                    onClick={() => setActiveTab('pending')}
                >
                    Pendientes ({pendingRequests.length})
                </TabsTrigger>
                <TabsTrigger
                    value="history"
                    active={activeTab === 'history'}
                    onClick={() => setActiveTab('history')}
                >
                    Historial
                </TabsTrigger>
            </TabsList>
            <TabsContent value="pending" active={activeTab === 'pending'}>
                {renderTable(pendingRequests, false)}
            </TabsContent>
            <TabsContent value="history" active={activeTab === 'history'}>
                {renderTable(historyRequests, true)}
            </TabsContent>
        </Tabs>
    );
}
