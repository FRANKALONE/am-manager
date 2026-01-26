import Link from "next/link";
import { getCurrentUser, getAuthSession } from "@/lib/auth";
import { getExpiringWPs, checkContractExpirations } from "@/app/actions/contract-actions";
import { getClients } from "@/app/actions/clients";
import { getParametersByCategory } from "@/app/actions/parameters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Filter, X } from "lucide-react";
import { redirect } from "next/navigation";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { RenewalsClient } from "./components/renewals-client";

export default async function RenewalsPage({ searchParams }: { searchParams: { client?: string, type?: string, from?: string, to?: string } }) {
    const user = await getCurrentUser();
    const session = await getAuthSession();

    if (!user || !session || (session.userRole !== 'ADMIN' && !session.permissions.view_renewals)) {
        redirect("/login");
    }

    const { client, type, from, to } = searchParams;

    const [expiringWPs, clients, contractTypes] = await Promise.all([
        getExpiringWPs({
            clientId: client,
            contractType: type,
            startDate: from ? new Date(from) : undefined,
            endDate: to ? new Date(to) : undefined
        }),
        getClients(),
        getParametersByCategory("CONTRACT_TYPE")
    ]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Gestión de Renovaciones</h2>
                    <p className="text-muted-foreground">
                        Seguimiento de contratos próximamente vencidos (60 días) y expirados en Dic 2025.
                    </p>
                </div>
                <div className="flex gap-2">
                    <form action={async () => {
                        "use server";
                        await checkContractExpirations();
                    }}>
                        <SubmitButton variant="outline">
                            <Bell className="w-4 h-4 mr-2" />
                            Lanzar Alertas (45 días)
                        </SubmitButton>
                    </form>
                </div>
            </div>

            <Card className="p-4 bg-slate-50/50">
                <form className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4 items-end">
                    <div className="space-y-1.5">
                        <Label htmlFor="client" className="text-xs uppercase font-bold text-muted-foreground">Cliente</Label>
                        <Select name="client" defaultValue={client || "all"}>
                            <SelectTrigger id="client" className="bg-white">
                                <SelectValue placeholder="Todos los clientes" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los clientes</SelectItem>
                                {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="type" className="text-xs uppercase font-bold text-muted-foreground">Tipo de Contrato</Label>
                        <Select name="type" defaultValue={type || "all"}>
                            <SelectTrigger id="type" className="bg-white">
                                <SelectValue placeholder="Todos los tipos" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los tipos</SelectItem>
                                {contractTypes.map(t => <SelectItem key={t.id} value={t.value}>{t.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="from" className="text-xs uppercase font-bold text-muted-foreground">Vence Desde</Label>
                        <Input type="date" name="from" id="from" defaultValue={from} className="bg-white" />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="to" className="text-xs uppercase font-bold text-muted-foreground">Vence Hasta</Label>
                        <Input type="date" name="to" id="to" defaultValue={to} className="bg-white" />
                    </div>

                    <div className="flex gap-2">
                        <Button type="submit" variant="default" className="flex-1">
                            <Filter className="w-4 h-4 mr-2" />
                            Filtrar
                        </Button>
                        {(client || type || from || to) && (
                            <Button variant="outline" asChild className="px-3">
                                <Link href="/admin/renewals">
                                    <X className="w-4 h-4" />
                                </Link>
                            </Button>
                        )}
                    </div>
                </form>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Renovaciones</CardTitle>
                    <CardDescription>
                        Seguimiento y gestión de contratos próximos a vencer (60 días) o expirados.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <RenewalsClient expiringWPs={expiringWPs} />
                </CardContent>
            </Card>
        </div>
    );
}

