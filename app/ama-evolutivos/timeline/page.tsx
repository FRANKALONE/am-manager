'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Calendar, Search, Filter } from 'lucide-react';
import { EvolutivoTimeline } from '@/app/evolutivos/components/evolutivo-timeline';

export default function TimelinePage() {
    const router = useRouter();
    const [evolutivos, setEvolutivos] = useState<any[]>([]);
    const [hitos, setHitos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedManager, setSelectedManager] = useState('');

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                const [evoRes, hitosRes] = await Promise.all([
                    fetch('/api/ama-evolutivos/evolutivos'),
                    fetch('/api/ama-evolutivos/issues')
                ]);

                if (evoRes.ok && hitosRes.ok) {
                    const evoData = await evoRes.json();
                    const hitosData = await hitosRes.json();

                    // The issues endpoint returns categorize issues, we need all of them
                    const allHitos = [
                        ...(hitosData.issues.expired || []),
                        ...(hitosData.issues.today || []),
                        ...(hitosData.issues.upcoming || []),
                        ...(hitosData.issues.others || []),
                        ...(hitosData.issues.unplanned || [])
                    ];

                    setEvolutivos(evoData);
                    setHitos(allHitos);
                }
            } catch (e) {
                console.error('Error fetching timeline data:', e);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    const filteredEvolutivos = evolutivos.filter(evo => {
        // Only show if it has hitos or is planned
        if ((evo.pendingHitos || 0) === 0) return false;

        const matchesSearch = evo.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
            evo.summary.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesManager = !selectedManager || evo.gestor?.id === selectedManager;

        return matchesSearch && matchesManager;
    });

    // Get unique managers for filter
    const managers = Array.from(new Set(evolutivos.map(e => e.gestor).filter(Boolean).map(g => JSON.stringify(g))))
        .map(s => JSON.parse(s));

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="p-3 bg-white hover:bg-gray-50 text-gray-600 rounded-xl border border-gray-200 shadow-sm transition-all"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Timeline de Evolutivos</h1>
                            <p className="text-gray-600 mt-1">Línea temporal de ejecución y hitos por proyecto</p>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar proyecto..."
                                className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 w-full md:w-64"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <select
                            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                            value={selectedManager}
                            onChange={(e) => setSelectedManager(e.target.value)}
                            title="Filtrar por Gestor"
                        >
                            <option value="">Todos los Gestores</option>
                            {managers.map((m: any) => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Timeline List */}
                <div className="space-y-12">
                    {filteredEvolutivos.length === 0 ? (
                        <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-300 text-center">
                            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 font-medium">No se han encontrado evolutivos planificados con los filtros actuales.</p>
                        </div>
                    ) : (
                        filteredEvolutivos.map((evo) => {
                            // Filter hitos that belong to this evolutivo
                            const evoHitos = hitos.filter(h => h.parentKey === evo.key)
                                .map(h => ({
                                    issueKey: h.key,
                                    issueSummary: h.summary,
                                    status: h.status,
                                    dueDate: h.dueDate,
                                    assignee: h.assignee?.displayName
                                }))
                                .sort((a, b) => {
                                    if (!a.dueDate) return 1;
                                    if (!b.dueDate) return -1;
                                    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                                });

                            return (
                                <div key={evo.key} className="space-y-6">
                                    <div className="flex items-center gap-3">
                                        <div className="h-px flex-1 bg-gray-200"></div>
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{evo.key}</span>
                                        <div className="h-px flex-1 bg-gray-200"></div>
                                    </div>

                                    <EvolutivoTimeline
                                        evolutivo={{
                                            id: evo.id,
                                            issueKey: evo.key,
                                            issueSummary: evo.summary,
                                            status: evo.status,
                                            billingMode: evo.billingMode,
                                            accumulatedHours: (evo.timespent || 0) / 3600,
                                            originalEstimate: (evo.timeoriginalestimate || 0) / 3600
                                        }}
                                        hitos={evoHitos}
                                        isAdmin={true} // Defaulting to true for now as this is an admin/internal tool
                                        portalUrl={null}
                                    />
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
