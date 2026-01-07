import { getJiraCustomerUsersByClient } from '@/app/actions/jira-customers';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const metadata = {
    title: 'Usuarios - Portal Cliente',
};

export default async function ClientUsersPage() {
    // Obtener información del usuario actual
    const userRole = cookies().get('user_role')?.value;
    const clientId = cookies().get('client_id')?.value;

    // Solo managers y admins del cliente pueden acceder
    if (!userRole || !['MANAGER', 'ADMIN'].includes(userRole)) {
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

    // Obtener usuarios JIRA del cliente
    const result = await getJiraCustomerUsersByClient(clientId);

    if (!result.success) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800">Error al cargar usuarios</p>
                </div>
            </div>
        );
    }

    const jiraUsers = result.users || [];

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Usuarios de la Organización</h1>
                <p className="text-gray-600 mt-1">
                    Usuarios de cliente registrados en JIRA Service Management
                </p>
            </div>

            {jiraUsers.length === 0 ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                    <p className="text-blue-800">
                        No hay usuarios JIRA sincronizados para tu organización.
                    </p>
                    <p className="text-blue-600 text-sm mt-2">
                        Contacta con el administrador para sincronizar los usuarios.
                    </p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {jiraUsers.map(user => (
                        <div
                            key={user.id}
                            className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <h3 className="font-semibold text-lg">{user.displayName}</h3>
                                    <p className="text-gray-600">{user.emailAddress || 'Sin email'}</p>
                                    <p className="text-sm text-gray-500 mt-1">{user.organization.name}</p>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className={`px-2 py-1 rounded text-xs font-medium ${user.active
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-gray-100 text-gray-800'
                                                }`}
                                        >
                                            {user.active ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </div>
                                    {user.linkedUser && (
                                        <div className="mt-2 text-sm">
                                            <p className="text-gray-500">Usuario vinculado:</p>
                                            <p className="font-medium">{user.linkedUser.name}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="text-sm text-gray-600">
                Total: {jiraUsers.length} usuario{jiraUsers.length !== 1 ? 's' : ''}
            </div>
        </div>
    );
}
