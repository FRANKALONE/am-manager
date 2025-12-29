"use client";

import { useEffect, useState } from "react";
import { debugGetFai320Regs } from "@/app/actions/debug";

export default function DebugPage() {
    const [data, setData] = useState<any>(null);

    const [fueData, setFueData] = useState<any>(null);
    const [cleaning, setCleaning] = useState(false);

    const refreshData = () => {
        debugGetFai320Regs().then(setData);
        import("@/app/actions/debug-sync").then(m => m.debugInspectFue652().then(setFueData));
    };

    useEffect(() => {
        refreshData();
    }, []);

    const handleCleanup = async () => {
        setCleaning(true);
        const { cleanupFUE652 } = await import("@/app/actions/cleanup-fue652");
        const res = await cleanupFUE652();
        if (res.success) {
            alert(`Limpieza completada: ${res.count} registros borrados.`);
            refreshData();
        } else {
            alert(`Error: ${res.error}`);
        }
        setCleaning(false);
    };

    if (!data) return <div>Cargando...</div>;

    return (
        <div className="p-10 space-y-10">
            <div className="flex items-center justify-between bg-yellow-100 p-2">
                <h1 className="text-2xl font-bold">Auditoría FUE-652</h1>
                <button
                    onClick={handleCleanup}
                    disabled={cleaning}
                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
                >
                    {cleaning ? 'Limpiando...' : '🔥 Limpiar residuos FUE-652'}
                </button>
            </div>
            {fueData && (
                <>
                    <section>
                        <h2 className="text-xl font-semibold">Regularizaciones (FUE-652)</h2>
                        <pre className="bg-slate-100 p-4 rounded mt-2 overflow-auto max-h-96">
                            {JSON.stringify(fueData.regularizations, null, 2)}
                        </pre>
                    </section>
                    <section>
                        <h2 className="text-xl font-semibold">WorklogDetail (FUE-652)</h2>
                        <pre className="bg-slate-100 p-4 rounded mt-2 overflow-auto max-h-96">
                            {JSON.stringify(fueData.worklogs, null, 2)}
                        </pre>
                    </section>
                </>
            )}
        </div>
    );
}
