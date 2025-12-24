"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";
import { syncWorkPackage } from "@/app/actions/sync";
import { useRouter } from "next/navigation";

export function SyncButton({ wpId }: { wpId: string }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSync = async () => {
        if (!confirm("¿Deseas sincronizar los worklogs de Tempo ahora? Esto podría tardar unos segundos.")) return;

        setLoading(true);
        const res = await syncWorkPackage(wpId);
        setLoading(false);

        if (res.error) {
            alert(`Error: ${res.error}`);
        } else {
            alert(`Sincronización completada.\nProcesados: ${res.processed} worklogs.\nTotal Horas: ${res.totalHours?.toFixed(1)}`);
            router.refresh();
        }
    };

    return (
        <Button variant="outline" size="sm" onClick={handleSync} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            {loading ? "Sincronizando..." : "Sincronizar Tempo"}
        </Button>
    );
}
