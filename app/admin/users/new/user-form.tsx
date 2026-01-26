"use client";

import { useFormState } from "react-dom";
import { createUser, updateUser } from "@/app/actions/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { useTranslations } from "@/lib/use-translations";

const initialState = {
    error: "",
    message: ""
};

type Props = {
    clients: any[];
    roles: any[];
    workPackages: any[];
    initialUser?: any; // If provided, we are in EDIT mode
    jiraEmployees?: any[];
};

export function UserForm({ clients, roles, workPackages, initialUser, jiraEmployees = [] }: Props) {
    const { t } = useTranslations();
    const isEdit = !!initialUser;

    // Bind the updateUser action with the user ID if editing
    const updateWithId = isEdit ? updateUser.bind(null, initialUser.id) : createUser;
    const [state, formAction] = useFormState(updateWithId as any, initialState);

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold tracking-tight mb-6">
                {isEdit ? t('users.form.editTitle') : t('users.form.newTitle')}
            </h1>

            <Card className="shadow-lg border-t-4 border-t-malachite">
                <CardHeader>
                    <CardTitle>{t('users.form.cardTitle')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <form action={formAction} className="space-y-4">
                        {state?.error && (
                            <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm font-medium">
                                {state.error}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">{t('users.form.name')} *</Label>
                                <Input id="name" name="name" defaultValue={initialUser?.name} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="surname">{t('users.form.surname')}</Label>
                                <Input id="surname" name="surname" defaultValue={initialUser?.surname} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">{t('users.form.email')} *</Label>
                            <Input id="email" name="email" type="email" defaultValue={initialUser?.email} required />
                        </div>

                        {!isEdit && (
                            <div className="space-y-2">
                                <Label htmlFor="password">{t('users.form.password')} *</Label>
                                <Input id="password" name="password" type="text" required placeholder={t('users.form.passwordPlaceholder')} />
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="role">{t('users.form.role')} *</Label>
                                <select
                                    id="role"
                                    name="role"
                                    required
                                    title={t('users.form.role')}
                                    defaultValue={initialUser?.role}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    <option value="">{t('users.form.select')}</option>
                                    {roles.map(r => (
                                        <option key={r.id} value={r.name}>
                                            {t(`users.roles.${r.name}`, { defaultValue: r.name })}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="clientId">{t('users.form.client')}</Label>
                                <select
                                    id="clientId"
                                    name="clientId"
                                    title={t('users.form.client')}
                                    defaultValue={initialUser?.clientId || ""}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    <option value="">{t('users.form.none')}</option>
                                    {clients.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="jiraGestorName">Usuario JIRA Relacionado (Opcional)</Label>
                            <select
                                id="jiraGestorName"
                                name="jiraGestorName"
                                title="Usuario JIRA Relacionado"
                                defaultValue={initialUser?.linkedEvolUser?.jiraGestorName || ""}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <option value="">No vinculado</option>
                                {jiraEmployees.map(emp => (
                                    <option key={emp.accountId} value={emp.displayName}>
                                        {emp.displayName}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-muted-foreground">
                                Solo para usuarios internos o de Altim. Se usa para vincular su actividad en JIRA.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="workPackageIds">{t('users.form.wps')}</Label>
                            <p className="text-sm text-muted-foreground mb-2">
                                {t('users.form.wpsHelp')}
                            </p>
                            <textarea
                                id="workPackageIds"
                                name="workPackageIds"
                                defaultValue={initialUser?.workPackageIds}
                                placeholder={t('users.form.wpsPlaceholder')}
                                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                            <p className="text-sm text-muted-foreground">
                                {t('users.form.wpsFormat')}
                            </p>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Link href="/admin/users">
                                <Button variant="outline" type="button">{t('users.form.cancel')}</Button>
                            </Link>
                            <Button type="submit" className="bg-malachite hover:bg-jade transition-colors">
                                {isEdit ? t('users.form.update') : t('users.form.save')}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
