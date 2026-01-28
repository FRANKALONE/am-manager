// app/analytics/annual-report/page.tsx
import { getAnnualReport } from '@/app/actions/analytics-annual';
import { getAuthSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import AnnualReportView from './components/annual-report-view';

export default async function AnnualReportPage({
    searchParams
}: {
    searchParams: { year?: string; client?: string };
}) {
    const session = await getAuthSession();
    if (!session) redirect('/login');

    const year = searchParams.year ? parseInt(searchParams.year) : new Date().getFullYear();
    const clientId = searchParams.client;

    const report = await getAnnualReport(year, clientId);

    return (
        <div className="container mx-auto p-6">
            <AnnualReportView report={report} year={year} clientId={clientId} />
        </div>
    );
}
