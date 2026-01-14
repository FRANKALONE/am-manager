'use client';

import { useEffect, useState, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    ChevronLeft,
    Calendar,
    User,
    AlertTriangle,
    Clock,
    ListTodo,
    ExternalLink,
    Search
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DashboardData, JiraIssue } from '@/lib/ama-evolutivos/types';
import { cn } from '@/lib/utils';

const CATEGORY_NAMES: Record<string, string> = {
    expired: 'Hitos Vencidos',
    today: 'Hitos para Hoy',
    upcoming: 'Próximos 7 Días',
    unplanned: 'Sin Planificar',
};

const CATEGORY_ICONS: Record<string, any> = {
    expired: AlertTriangle,
    today: Calendar,
    upcoming: Clock,
    unplanned: ListTodo,
};

const CATEGORY_COLORS: Record<string, string> = {
    expired: 'text-red-600 bg-red-50 border-red-100',
    today: 'text-amber-600 bg-amber-50 border-amber-100',
    upcoming: 'text-blue-600 bg-blue-50 border-blue-100',
    unplanned: 'text-purple-600 bg-purple-50 border-purple-100',
};

export default function HitosListPage({ params }: { params: Promise<{ category: string }> }) {
    const { category } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();
    const managerId = searchParams.get('manager') || '';

    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch('/api/ama-evolutivos/issues');
                if (res.ok) {
                    const json = await res.json();
                    setData(json);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!data) return null;

    const allIssues = data.issues[category as keyof typeof data.issues] || [];

    const filteredIssues = allIssues.filter(issue => {
        // Filter by manager
        if (managerId) {
            if (managerId === 'unassigned') {
                if (issue.gestor && issue.gestor.id) return false;
            } else {
                if (issue.gestor?.id !== managerId) return false;
            }
        }

        // Filter by search term
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            return (
                issue.key.toLowerCase().includes(search) ||
                issue.summary.toLowerCase().includes(search)
            );
        }

        return true;
    });

    const Icon = CATEGORY_ICONS[category] || ListTodo;
    const colorClass = CATEGORY_COLORS[category] || 'text-gray-600 bg-gray-50 border-gray-100';

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Navigation Header */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors font-medium"
                    >
                        <ChevronLeft className="w-5 h-5" />
                        Volver al Dashboard
                    </button>

                    {managerId && (
                        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-200 text-sm">
                            <User className="w-4 h-4 text-blue-600" />
                            <span className="text-gray-600">Filtrado por: </span>
                            <span className="font-bold text-gray-900">
                                {managerId === 'unassigned' ? 'Sin asignar' : data.managers.find(m => m.id === managerId)?.name || 'Gestor'}
                            </span>
                        </div>
                    )}
                </div>

                {/* Title and Search */}
                <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className={cn("p-4 rounded-2xl border", colorClass)}>
                                <Icon className="w-8 h-8" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">{CATEGORY_NAMES[category] || 'Lista de Hitos'}</h1>
                                <p className="text-gray-600">{filteredIssues.length} hitos encontrados</p>
                            </div>
                        </div>

                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar por clave o título..."
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all font-medium"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    <th className="py-4 px-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Clave</th>
                                    <th className="py-4 px-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Resumen</th>
                                    <th className="py-4 px-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                                    <th className="py-4 px-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Vencimiento</th>
                                    <th className="py-4 px-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Gestor</th>
                                    <th className="py-4 px-4 text-sm font-semibold text-gray-500 uppercase tracking-wider text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredIssues.map((issue) => (
                                    <tr key={issue.key} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="py-4 px-4">
                                            <span className="font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded text-sm">
                                                {issue.key}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4 max-w-md">
                                            <p className="text-gray-900 font-medium truncate">{issue.summary}</p>
                                            {issue.parentKey && (
                                                <p className="text-xs text-gray-400 mt-0.5">Epic: {issue.parentKey}</p>
                                            )}
                                        </td>
                                        <td className="py-4 px-4">
                                            <span className={cn(
                                                "px-3 py-1 rounded-full text-xs font-bold uppercase",
                                                issue.status === 'Cerrado' || issue.status === 'Done' ? "bg-emerald-100 text-emerald-700" :
                                                    issue.status === 'In Progress' ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"
                                            )}>
                                                {issue.status}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4">
                                            {issue.dueDate ? (
                                                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                                    <Calendar className="w-4 h-4" />
                                                    {format(new Date(issue.dueDate), "dd MMM yyyy", { locale: es })}
                                                </div>
                                            ) : (
                                                <span className="text-sm text-gray-400 italic">No definida</span>
                                            )}
                                        </td>
                                        <td className="py-4 px-4 text-sm text-gray-600 font-medium">
                                            {issue.gestor?.name || <span className="text-gray-400 italic">No asignado</span>}
                                        </td>
                                        <td className="py-4 px-4 text-right">
                                            <a
                                                href={`${process.env.NEXT_PUBLIC_JIRA_DOMAIN || 'https://altim.atlassian.net'}/browse/${issue.key}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium text-xs"
                                            >
                                                JIRA
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        </td>
                                    </tr>
                                ))}

                                {filteredIssues.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="py-12 text-center text-gray-500 font-medium italic">
                                            No se han encontrado hitos en esta categoría.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
