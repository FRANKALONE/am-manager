
"use client";

import { useState } from 'react';
import { syncWorkPackage } from '@/app/actions/sync';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Play } from "lucide-react";
import { toast } from "sonner";

export function PerformanceSyncDiagnostic() {
    const [wpId, setWpId] = useState('NOVIS - Mant. Funcional');
    const [days, setDays] = useState(180);
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const handleSync = async () => {
        setLoading(true);
        setResult(null);
        toast.info(`Starting debug sync for ${wpId}...`);
        try {
            const res = await syncWorkPackage(wpId, true, days);
            setResult(res);
            if (res.error) {
                toast.error(`Sync failed: ${res.error}`);
            } else {
                toast.success(`Sync finished! Check server console for logs.`);
            }
        } catch (e: any) {
            setResult({ error: e.message });
            toast.error(`Fatal error: ${e.message}`);
        }
        setLoading(false);
    };

    return (
        <Card className="border-red-200">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Play className="w-5 h-5 text-red-500" />
                    Performance Sync Debug Tool
                </CardTitle>
                <CardDescription>
                    Run a controlled sync with detailed performance logging. Output will appear in the server console.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex gap-4 mb-4">
                    <div className="flex-1">
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Work Package ID</label>
                        <Input
                            value={wpId}
                            onChange={(e) => setWpId(e.target.value)}
                            placeholder="Work Package ID"
                        />
                    </div>
                    <div className="w-24">
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Days</label>
                        <Input
                            type="number"
                            value={days}
                            onChange={(e) => setDays(Number(e.target.value))}
                            placeholder="Days"
                        />
                    </div>
                    <div className="flex items-end">
                        <Button
                            variant="destructive"
                            onClick={handleSync}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Syncing...
                                </>
                            ) : (
                                "Run Debug Sync"
                            )}
                        </Button>
                    </div>
                </div>

                {result && (
                    <div className="mt-4">
                        <h4 className="text-sm font-bold mb-2">Result Summary:</h4>
                        <pre className="bg-slate-950 text-slate-50 p-4 rounded text-xs overflow-auto max-h-60">
                            {JSON.stringify({
                                success: result.success,
                                error: result.error,
                                totalHours: result.totalHours,
                                processed: result.processed,
                                logCount: result.logs?.length
                            }, null, 2)}
                        </pre>
                        <p className="text-xs text-muted-foreground mt-2 italic">
                            * Full details and timing logs are available in the server's stdout.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
