// components/ama-evolutivos/StatCard.tsx
'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
    title: string;
    count: number;
    icon: React.ReactNode;
    color: 'red' | 'amber' | 'blue' | 'purple';
    href: string;
}

const colorClasses = {
    red: {
        bg: 'bg-red-50',
        border: 'border-red-100',
        icon: 'text-red-600',
        count: 'text-red-700',
        hover: 'hover:border-red-200',
    },
    amber: {
        bg: 'bg-amber-50',
        border: 'border-amber-100',
        icon: 'text-amber-600',
        count: 'text-amber-700',
        hover: 'hover:border-amber-200',
    },
    blue: {
        bg: 'bg-blue-50',
        border: 'border-blue-100',
        icon: 'text-blue-600',
        count: 'text-blue-700',
        hover: 'hover:border-blue-200',
    },
    purple: {
        bg: 'bg-purple-50',
        border: 'border-purple-100',
        icon: 'text-purple-600',
        count: 'text-purple-700',
        hover: 'hover:border-purple-200',
    },
};

export function StatCard({ title, count, icon, color, href }: StatCardProps) {
    const classes = colorClasses[color];

    return (
        <Link
            href={href}
            className={cn(
                'group relative overflow-hidden rounded-2xl p-6 border-2 transition-all duration-300 hover:shadow-lg',
                classes.bg,
                classes.border,
                classes.hover
            )}
        >
            <div className="flex items-center justify-between mb-4">
                <div className={cn('p-3 rounded-xl', classes.bg, classes.icon)}>
                    {icon}
                </div>
                <ArrowRight className={cn('w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity', classes.icon)} />
            </div>

            <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
            <p className={cn('text-4xl font-bold', classes.count)}>{count}</p>
        </Link>
    );
}
