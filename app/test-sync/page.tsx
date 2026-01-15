
"use client";

import { useState } from 'react';
import { syncWorkPackage } from '@/app/actions/sync';

export default function TestSyncPage() {
    const [wpId, setWpId] = useState('NOVIS - Mant. Funcional');
    const [days, setDays] = useState(180);
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const handleSync = async () => {
        setLoading(true);
        try {
            const res = await syncWorkPackage(wpId, true, days);
            setResult(res);
        } catch (e: any) {
            setResult({ error: e.message });
        }
        setLoading(false);
    };

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Sync Test Utility</h1>
            <div className="flex gap-4 mb-4">
                <input
                    className="border p-2 rounded w-64 text-black"
                    value={wpId}
                    onChange={(e) => setWpId(e.target.value)}
                    placeholder="Work Package ID"
                />
                <input
                    className="border p-2 rounded w-24 text-black"
                    type="number"
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                    placeholder="Days"
                />
                <button
                    className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
                    onClick={handleSync}
                    disabled={loading}
                >
                    {loading ? 'Syncing...' : 'Run Test Sync'}
                </button>
            </div>

            {result && (
                <div className="mt-4">
                    <h2 className="font-bold">Result:</h2>
                    <pre className="bg-gray-100 p-4 rounded mt-2 overflow-auto max-h-96 text-black">
                        {JSON.stringify(result, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}
