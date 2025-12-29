"use client";

import { useEffect, useState } from "react";
import { debugGetFai320Regs } from "@/app/actions/debug";

export default function DebugPage() {
    const [data, setData] = useState<any>(null);

    const [fueData, setFueData] = useState<any>(null);

    useEffect(() => {
        debugGetFai320Regs().then(setData);
        import("@/app/actions/debug-sync").then(m => m.debugInspectFue652().then(setFueData));
    }, []);

    if (!data) return <div>Cargando...</div>;

    return (
        <div className="p-10 space-y-10">
            <h1 className="text-2xl font-bold bg-yellow-100 p-2">Auditoría FUE-652</h1>
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
