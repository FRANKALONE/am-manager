import { getRoles } from "@/app/actions/roles";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil } from "lucide-react";

export default async function RolesPage() {
    const roles = await getRoles();

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Gestión de Roles</h1>
                <Link href="/admin/roles/new">
                    <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Crear Rol
                    </Button>
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Roles del Sistema</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left p-3">Nombre</th>
                                    <th className="text-left p-3">Descripción</th>
                                    <th className="text-left p-3">Estado</th>
                                    <th className="text-right p-3">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {roles.map((role) => (
                                    <tr key={role.id} className="border-b hover:bg-gray-50">
                                        <td className="p-3 font-medium">{role.name}</td>
                                        <td className="p-3">{role.description || '-'}</td>
                                        <td className="p-3">
                                            {role.isActive ? (
                                                <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                                                    Activo
                                                </span>
                                            ) : (
                                                <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">
                                                    Inactivo
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-3">
                                            <div className="flex justify-end gap-2">
                                                <Link href={`/admin/roles/${role.id}/edit`}>
                                                    <Button variant="outline" size="sm">
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
