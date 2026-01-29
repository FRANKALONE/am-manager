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
            <Suspense key={`${year}-${clientId}`} fallback={<AnnualReportSkeleton />}>
                <ReportContainer year={year} clientId={clientId} />
            </Suspense>
        </div>
    );
}
