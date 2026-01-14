// components/ama-evolutivos/CategoryCard.tsx
'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CategoryCardProps {
    title: string;
    subtitle: string;
    count: number;
    icon: React.ReactNode;
    href: string;
    theme: 'green' | 'orange';
}

const themeClasses = {
    green: {
        bg: 'bg-emerald-50',
        border: 'border-emerald-100',
        iconBg: 'bg-emerald-100',
        icon: 'text-emerald-600',
        count: 'text-emerald-700',
        hover: 'hover:border-emerald-200',
    },
    orange: {
        bg: 'bg-orange-50',
        border: 'border-orange-100',
        iconBg: 'bg-orange-100',
        icon: 'text-orange-600',
        count: 'text-orange-700',
        hover: 'hover:border-orange-200',
    },
};

export function CategoryCard({ title, subtitle, count, icon, href, theme }: CategoryCardProps) {
    const classes = themeClasses[theme];

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
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className={cn('p-3 rounded-xl', classes.iconBg, classes.icon)}>
                        {icon}
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">{title}</h3>
                        <p className="text-sm text-gray-600">{subtitle}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className={cn('text-3xl font-bold', classes.count)}>{count}</span>
                    <ArrowRight className={cn('w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity', classes.icon)} />
                </div>
            </div>
        </Link>
    );
}
