'use client';

import { useState } from 'react';
import { syncClientJiraUsers } from '@/app/actions/jira-customers';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface SyncButtonProps {
    clientId: string;
    clientName: string;
}

export function SyncButton({ clientId, clientName }: SyncButtonProps) {
    const [syncing, setSyncing] = useState(false);

    const handleSync = async () => {
        setSyncing(true);
        try {
            const result = await syncClientJiraUsers(clientId);

            if (result.success) {
                toast.success(result.message || 'Sincronización completada');
            } else {
                toast.error(result.error || 'Error en la sincronización');
            }
        } catch (error) {
            toast.error('Error al sincronizar');
        } finally {
            setSyncing(false);
        }
    };

    return (
        <Button
            onClick={handleSync}
            disabled={syncing}
            size="sm"
            variant="outline"
        >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Sincronizando...' : 'Sincronizar'}
        </Button>
    );
}
