"use client";

import { useEffect, useState } from "react";
import { debugGetFai320Regs } from "@/app/actions/debug";

export default function DebugPage() {
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        debugGetFai320Regs().then(setData);
    }, []);

    if (!data) return <div>Cargando...</div>;

    return (
        <div className="p-10 space-y-10">
            <h1 className="text-2xl font-bold">Auditoría FAI-320</h1>

            <section>
                <h2 className="text-xl font-semibold">Regularizaciones (MANUAL_CONSUMPTION)</h2>
                <pre className="bg-slate-100 p-4 rounded mt-2 overflow-auto max-h-96">
                    {JSON.stringify(data.regs, null, 2)}
                </pre>
            </section>

            <section>
                <h2 className="text-xl font-semibold">WorklogDetail (Consumo Manual)</h2>
                <pre className="bg-slate-100 p-4 rounded mt-2 overflow-auto max-h-96">
                    {JSON.stringify(data.worklogs, null, 2)}
                </pre>
            </section>
        </div>
    );
}
