import { getAnnualReport } from '@/app/actions/analytics-annual';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import AnnualReportView from './components/annual-report-view';
import AnnualReportSkeleton from './components/annual-report-skeleton';
import { Suspense } from 'react';

export const metadata = {
    title: 'Informe Anual AM | Manager AM',
    description: 'Análisis estratégico anual de operaciones y equipo AM',
};

async function ReportContainer({ year, clientId }: { year: number, clientId?: string }) {
    const report = await getAnnualReport(year, clientId);
    return <AnnualReportView report={report} year={year} clientId={clientId} />;
}

export default async function AnnualReportPage({
    searchParams
}: {
    searchParams: { year?: string; client?: string };
}) {
    const session = await getSession();
    if (!session) redirect('/login');

    const year = searchParams.year ? parseInt(searchParams.year) : new Date().getFullYear();
    const clientId = searchParams.client;

    return (
        <div className="container mx-auto p-6 min-h-screen">
            <div className="flex flex-col gap-6">
                {/* Navigation Header */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-4">
                        <a
                            href="/analytics"
                            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm text-sm font-medium"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                            Volver a Analytics
                        </a>
                        <div className="h-6 w-px bg-slate-200" />
                        <h1 className="text-xl font-bold text-slate-900">Informe Estratégico Anual</h1>
                    </div>
                    <div className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold border border-indigo-100 uppercase tracking-wider">
                        Edición {year}
                    </div>
                </div>

                <Suspense key={`${year}-${clientId}`} fallback={<AnnualReportSkeleton />}>
                    <ReportContainer year={year} clientId={clientId} />
                </Suspense>
            </div>
        </div>
    );
}
