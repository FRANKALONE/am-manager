import { Suspense } from 'react';
import { getAllJiraCustomerUsers } from '@/app/actions/jira-customers';
import { JiraUsersTable } from './components/jira-users-table';
import { SyncAllButton } from './components/sync-all-button';

export const metadata = {
    title: 'Usuarios JIRA - Admin',
};

export default async function JiraCustomersPage() {
    const result = await getAllJiraCustomerUsers();

    if (!result.success) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800">Error al cargar usuarios JIRA</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Usuarios JIRA</h1>
                    <p className="text-gray-600 mt-1">
                        Gestiona usuarios de cliente sincronizados desde JIRA Service Management
                    </p>
                </div>
                <SyncAllButton />
            </div>

            <Suspense fallback={<div>Cargando...</div>}>
                <JiraUsersTable users={result.users || []} />
            </Suspense>
        </div>
    );
}
