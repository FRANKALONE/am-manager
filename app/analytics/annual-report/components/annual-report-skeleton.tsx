'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function AnnualReportSkeleton() {
    return (
        <div className="space-y-8 pb-12 animate-pulse">
            {/* Header Skeleton */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="space-y-2">
                    <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
                    <div className="h-4 w-48 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
                </div>
                <div className="flex gap-3">
                    <div className="h-10 w-32 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                    <div className="h-10 w-48 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                </div>
            </div>

            {/* KPI Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                {[1, 2, 3, 4, 5].map((i) => (
                    <Card key={i} className="rounded-2xl border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start">
                                <div className="space-y-3">
                                    <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800 rounded"></div>
                                    <div className="h-8 w-16 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
                                    <div className="h-3 w-24 bg-slate-100 dark:bg-slate-800 rounded"></div>
                                </div>
                                <div className="h-12 w-12 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Main Chart Skeleton */}
            <Card className="rounded-2xl border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
                <CardHeader className="border-b border-slate-50 dark:border-slate-800 py-6">
                    <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
                </CardHeader>
                <CardContent className="p-8">
                    <div className="h-[350px] w-full bg-slate-50 dark:bg-slate-800/50 rounded-2xl"></div>
                </CardContent>
            </Card>

            {/* Two Column Section Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[1, 2].map((i) => (
                    <Card key={i} className="rounded-2xl border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
                        <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 py-4 px-6">
                            <div className="h-5 w-40 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full"></div>
                            <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full"></div>
                            <div className="grid grid-cols-2 gap-4 pt-4">
                                <div className="h-20 bg-slate-50 dark:bg-slate-800 rounded-2xl"></div>
                                <div className="h-20 bg-slate-50 dark:bg-slate-800 rounded-2xl"></div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
