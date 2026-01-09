import { getUsers, deleteUser, UserFilters as FilterType } from "@/app/actions/users";
import { getClients } from "@/app/actions/clients";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { getTranslations } from "@/lib/get-translations";
import { formatDate } from "@/lib/date-utils";
import { ResetPasswordDialog } from "./components/reset-password-dialog";
import { UserFilters } from "./components/user-filters";

export default async function UsersPage({
    searchParams
}: {
    searchParams: { [key: string]: string | string[] | undefined }
}) {
    const filters: FilterType = {
        email: searchParams.email as string,
        role: searchParams.role as string,
        clientId: searchParams.clientId as string,
        lastLoginFrom: searchParams.lastLoginFrom as string,
        lastLoginTo: searchParams.lastLoginTo as string,
    };

    const users = await getUsers(filters);
    const clients = await getClients();
    const { t, locale } = await getTranslations();

    async function deleteAction(id: string) {
        "use server";
        await deleteUser(id);
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t('users.title')}</h1>
                    <p className="text-muted-foreground">
                        {t('users.subtitle')}
                    </p>
                </div>
                <Link href="/admin/users/new">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> {t('users.newButton')}
                    </Button>
                </Link>
            </div>

            <UserFilters clients={clients} />

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('users.table.name')}</TableHead>
                            <TableHead>{t('users.table.email')}</TableHead>
                            <TableHead>{t('users.table.role')}</TableHead>
                            <TableHead>{t('users.table.client')}</TableHead>
                            <TableHead>{t('users.table.lastLogin')}</TableHead>
                            <TableHead className="text-right">{t('users.table.actions')}</TableHead>
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
                                        {t(`users.roles.${user.role}`)}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    {user.client?.name || "-"}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {user.lastLoginAt ? formatDate(user.lastLoginAt) : t('users.never')}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <ResetPasswordDialog userId={user.id} userName={`${user.name} ${user.surname || ''}`} />
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
