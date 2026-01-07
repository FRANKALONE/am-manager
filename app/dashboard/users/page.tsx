import { getAppUsersByClient } from '@/app/actions/client-users';
import { getJiraCustomerUsersByClient } from '@/app/actions/jira-customers';
import { getMe } from '@/app/actions/users';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { UsersPortal } from './components/users-portal';

export const metadata = {
    title: 'Gestión de Usuarios - Portal Cliente',
};

import { SharedHeader } from '@/app/components/shared-header';
import { Footer } from '@/app/components/footer';

export default async function ClientUsersPage() {
    // Obtener información del usuario actual
    const userRole = cookies().get('user_role')?.value;
    let clientId = cookies().get('client_id')?.value;

    // Solo CLIENTE y MANAGER pueden acceder
    if (!userRole || !['CLIENTE', 'MANAGER'].includes(userRole)) {
        redirect('/dashboard');
    }

    // Fallback: si no hay cookie client_id, obtener del usuario en BD
    if (!clientId) {
        const user = await getMe();
        if (user?.clientId) {
            clientId = user.clientId;
        }
    }

    if (!clientId) {
        return (
            <>
                <SharedHeader title="Gestión de Usuarios" />
                <main className="container mx-auto py-8 px-4 md:px-6 flex-1">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-yellow-800">No se pudo identificar el cliente</p>
                        <p className="text-sm text-yellow-600 mt-2">
                            Tu usuario no tiene un cliente asignado. Contacta con el administrador.
                        </p>
                    </div>
                </main>
                <Footer />
            </>
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
            <>
                <SharedHeader title="Gestión de Usuarios" />
                <main className="container mx-auto py-8 px-4 md:px-6 flex-1">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-red-800">Error al cargar usuarios</p>
                        <p className="text-sm text-red-600 mt-2">
                            {appUsersResult.error || jiraUsersResult.error || 'Error desconocido'}
                        </p>
                    </div>
                </main>
                <Footer />
            </>
        );
    }

    const appUsers = appUsersResult.users || [];
    const jiraUsers = jiraUsersResult.users || [];

    return (
        <>
            <SharedHeader title="Gestión de Usuarios" />
            <main className="container mx-auto py-8 px-4 md:px-6 flex-1">
                <UsersPortal
                    appUsers={appUsers}
                    jiraUsers={jiraUsers}
                    clientId={clientId}
                    isClientRole={isClientRole}
                />
            </main>
            <Footer />
        </>
    );
}
