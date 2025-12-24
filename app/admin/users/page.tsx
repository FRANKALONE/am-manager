import { getUsers, deleteUser } from "@/app/actions/users";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { Plus, Pencil, Trash2 } from "lucide-react";

export default async function UsersPage() {
    const users = await getUsers();

    async function deleteAction(id: string) {
        "use server";
        await deleteUser(id);
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Usuarios</h1>
                    <p className="text-muted-foreground">
                        Gestión de usuarios y permisos de acceso.
                    </p>
                </div>
                <Link href="/admin/users/new">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> Nuevo Usuario
                    </Button>
                </Link>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Rol</TableHead>
                            <TableHead>Cliente Asociado</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell className="font-medium">
                                    {user.name} {user.surname}
                                </TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                                        {user.role}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    {user.client?.name || "-"}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Link href={`/admin/users/${user.id}/edit`}>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                        </Link>
                                        <form action={deleteAction.bind(null, user.id)}>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </form>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
