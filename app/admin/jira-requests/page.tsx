import { Suspense } from 'react';
import { getPendingJiraUserRequests, getJiraUserRequestsHistory } from '@/app/actions/jira-user-requests';
import { getCurrentUser, getAuthSession } from '@/lib/auth';
import { JiraRequestsTable } from './components/jira-requests-table';
import { redirect } from 'next/navigation';

export const metadata = {
    title: 'Solicitudes JIRA - Admin',
};

export default async function JiraRequestsPage() {
    const user = await getCurrentUser();
    const session = await getAuthSession();

    if (!user || !session || (session.userRole !== 'ADMIN' && !session.permissions.manage_jira_requests)) {
        redirect('/dashboard');
    }

    const [pending, history] = await Promise.all([
        getPendingJiraUserRequests(),
        getJiraUserRequestsHistory()
    ]);

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Solicitudes de Usuarios JIRA</h1>
                    <p className="text-gray-600 mt-1">
                        Gestiona las peticiones de creación y eliminación de usuarios enviadas por los clientes.
                    </p>
                </div>
            </div>

            <Suspense fallback={<div>Cargando solicitudes...</div>}>
                <JiraRequestsTable
                    pendingRequests={pending}
                    historyRequests={history}
                    currentUserId={user.id}
                />
            </Suspense>
        </div>
    );
}
