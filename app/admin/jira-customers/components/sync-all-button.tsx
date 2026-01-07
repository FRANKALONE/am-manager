'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function SyncAllButton() {
    const [syncing, setSyncing] = useState(false);

    const handleSyncAll = async () => {
        setSyncing(true);
        toast.info('Esta funcionalidad sincronizará todos los clientes. Por ahora, sincroniza clientes individualmente.');
        setSyncing(false);
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button disabled={syncing}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                    Sincronizar Todos
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Sincronizar todos los clientes</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción sincronizará los usuarios JIRA de todos los clientes que tengan
                        un proyecto JIRA configurado. Esto puede tardar varios minutos.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSyncAll}>
                        Continuar
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
