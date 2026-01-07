import { getAppUsersByClient } from '@/app/actions/client-users';
import { getJiraCustomerUsersByClient } from '@/app/actions/jira-customers';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { UsersPortal } from './components/users-portal';

export const metadata = {
    title: 'Gestión de Usuarios - Portal Cliente',
};

export default async function ClientUsersPage() {
    // Obtener información del usuario actual
    const userRole = cookies().get('user_role')?.value;
    const clientId = cookies().get('client_id')?.value;

    // Solo CLIENTE y MANAGER pueden acceder
    if (!userRole || !['CLIENTE', 'MANAGER'].includes(userRole)) {
        redirect('/dashboard');
    }

    if (!clientId) {
        return (
            <div className="p-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800">No se pudo identificar el cliente</p>
                </div>
            </div>
        );
    }

    const isClientRole = userRole === 'CLIENTE';

    // Obtener usuarios de la app y de JIRA en paralelo
    const [appUsersResult, jiraUsersResult] = await Promise.all([
        getAppUsersByClient(clientId),
        getJiraCustomerUsersByClient(clientId)
    ]);

    if (!appUsersResult.success || !jiraUsersResult.success) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800">Error al cargar usuarios</p>
                </div>
            </div>
        );
    }

    const appUsers = appUsersResult.users || [];
    const jiraUsers = jiraUsersResult.users || [];

    return (
        <div className="p-6">
            <UsersPortal
                appUsers={appUsers}
                jiraUsers={jiraUsers}
                clientId={clientId}
                isClientRole={isClientRole}
            />
        </div>
    );
}
