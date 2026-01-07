'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, RefreshCw, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { prisma } from '@/lib/prisma';

interface SyncResult {
    clientId: string;
    clientName: string;
    success: boolean;
    stats?: {
        organizations: number;
        users: number;
    };
    error?: string;
}

export function BulkSyncJiraCustomersManager() {
    const [syncing, setSyncing] = useState(false);
    const [results, setResults] = useState<SyncResult[]>([]);
    const [showResults, setShowResults] = useState(false);

    const handleBulkSync = async () => {
        setSyncing(true);
        setResults([]);
        setShowResults(true);

        try {
            // Obtener todos los clientes con proyecto JIRA configurado
            const response = await fetch('/api/clients-with-jira');
            const { clients } = await response.json();

            if (!clients || clients.length === 0) {
                toast.info('No hay clientes con proyectos JIRA configurados');
                setSyncing(false);
                return;
            }

            toast.info(`Iniciando sincronización de ${clients.length} clientes...`);

            const syncResults: SyncResult[] = [];

            // Sincronizar cada cliente
            for (const client of clients) {
                try {
                    const syncResponse = await fetch('/api/sync-jira-users', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ clientId: client.id })
                    });

                    const result = await syncResponse.json();

                    syncResults.push({
                        clientId: client.id,
                        clientName: client.name,
                        success: result.success,
                        stats: result.stats,
                        error: result.error
                    });

                    // Actualizar resultados en tiempo real
                    setResults([...syncResults]);

                } catch (error) {
                    syncResults.push({
                        clientId: client.id,
                        clientName: client.name,
                        success: false,
                        error: 'Error de conexión'
                    });
                    setResults([...syncResults]);
                }
            }

            const successCount = syncResults.filter(r => r.success).length;
            const errorCount = syncResults.filter(r => !r.success).length;

            if (errorCount === 0) {
                toast.success(`Sincronización completada: ${successCount} clientes`);
            } else {
                toast.warning(`Completado con errores: ${successCount} éxitos, ${errorCount} errores`);
            }

        } catch (error) {
            toast.error('Error al iniciar la sincronización masiva');
            console.error(error);
        } finally {
            setSyncing(false);
        }
    };

    const totalOrgs = results.reduce((sum, r) => sum + (r.stats?.organizations || 0), 0);
    const totalUsers = results.reduce((sum, r) => sum + (r.stats?.users || 0), 0);
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Sincronización Masiva de Usuarios JIRA
                </CardTitle>
                <CardDescription>
                    Sincroniza usuarios de cliente de JIRA Service Management para todos los clientes configurados
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Este proceso sincronizará los usuarios de cliente de JIRA para todos los clientes que tengan
                        un proyecto JIRA configurado y que sea de tipo Service Desk. Puede tardar varios minutos.
                    </AlertDescription>
                </Alert>

                <Button
                    onClick={handleBulkSync}
                    disabled={syncing}
                    className="w-full"
                >
                    <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? 'Sincronizando...' : 'Sincronizar Todos los Clientes'}
                </Button>

                {showResults && results.length > 0 && (
                    <div className="space-y-4 mt-6">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-4">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-green-600">{successCount}</div>
                                    <div className="text-xs text-gray-600">Éxitos</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-red-600">{errorCount}</div>
                                    <div className="text-xs text-gray-600">Errores</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-blue-600">{totalOrgs}</div>
                                    <div className="text-xs text-gray-600">Organizaciones</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-purple-600">{totalUsers}</div>
                                    <div className="text-xs text-gray-600">Usuarios</div>
                                </div>
                            </div>
                            {!syncing && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowResults(false)}
                                >
                                    Cerrar
                                </Button>
                            )}
                        </div>

                        <div className="max-h-96 overflow-y-auto space-y-2">
                            {results.map((result, index) => (
                                <div
                                    key={result.clientId}
                                    className={`p-3 rounded-lg border ${result.success
                                            ? 'bg-green-50 border-green-200'
                                            : 'bg-red-50 border-red-200'
                                        }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-2">
                                            {result.success ? (
                                                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                                            ) : (
                                                <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                                            )}
                                            <div>
                                                <div className="font-medium">{result.clientName}</div>
                                                {result.success && result.stats && (
                                                    <div className="text-sm text-gray-600">
                                                        {result.stats.organizations} org{result.stats.organizations !== 1 ? 's' : ''}, {' '}
                                                        {result.stats.users} usuario{result.stats.users !== 1 ? 's' : ''}
                                                    </div>
                                                )}
                                                {!result.success && result.error && (
                                                    <div className="text-sm text-red-600">{result.error}</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
