// components/ama-evolutivos/WorklogModal.tsx
// Modal component to display worklog breakdown by author

'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface Worklog {
    author: {
        displayName: string;
        accountId: string;
    };
    timeSpentSeconds: number;
}

interface WorklogModalProps {
    issue: {
        id: string;
        key: string;
        timespent?: number;
    } | null;
    onClose: () => void;
}

export function WorklogModal({ issue, onClose }: WorklogModalProps) {
    const [worklogs, setWorklogs] = useState<Worklog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (issue?.id) {
            setLoading(true);
            fetch(`/api/tempo/worklogs?issueId=${issue.id}`)
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        setWorklogs(data);
                    } else {
                        console.error('Tempo data invalid', data);
                        setWorklogs([]);
                    }
                })
                .catch(err => {
                    console.error('Error fetching worklogs:', err);
                    setWorklogs([]);
                })
                .finally(() => setLoading(false));
        }
    }, [issue]);

    if (!issue) return null;

    // Aggregate by author
    const byAuthor: Record<string, number> = {};
    worklogs.forEach((w) => {
        const authorName = w.author?.displayName || 'Desconocido';
        byAuthor[authorName] = (byAuthor[authorName] || 0) + w.timeSpentSeconds;
    });

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-lg text-gray-800">
                        Imputaciones: {issue.key}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                        aria-label="Cerrar modal"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="p-4 max-h-[60vh] overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <div className="animate-spin h-6 w-6 border-2 border-indigo-500 rounded-full border-t-transparent"></div>
                        </div>
                    ) : Object.keys(byAuthor).length === 0 ? (
                        <p className="text-gray-500 text-center py-4">
                            No hay imputaciones registradas.
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {Object.entries(byAuthor)
                                .sort(([, a], [, b]) => b - a)
                                .map(([author, seconds]) => {
                                    const hours = (seconds / 3600).toFixed(2);
                                    return (
                                        <div
                                            key={author}
                                            className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                                    {author.charAt(0)}
                                                </div>
                                                <span className="font-medium text-gray-700 text-sm">
                                                    {author}
                                                </span>
                                            </div>
                                            <span className="font-mono font-bold text-gray-900">
                                                {hours} h
                                            </span>
                                        </div>
                                    );
                                })}
                        </div>
                    )}
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-100 text-right">
                    <span className="text-xs text-gray-500 mr-2">
                        Total Imputado (Jira):
                    </span>
                    <span className="font-bold text-indigo-600 text-lg">
                        {((issue.timespent || 0) / 3600).toFixed(2)} h
                    </span>
                </div>
            </div>
        </div>
    );
}
