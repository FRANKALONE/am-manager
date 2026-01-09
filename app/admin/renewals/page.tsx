import Link from "next/link";
import { formatDate } from "@/lib/date-utils";
import { getCurrentUser, getAuthSession } from "@/lib/auth";
import { getExpiringWPs, renewWorkPackageAuto, checkContractExpirations, cancelWorkPackageRenewal } from "@/app/actions/contract-actions";
import { getClients } from "@/app/actions/clients";
import { getParametersByCategory } from "@/app/actions/parameters";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, RefreshCcw, Bell, Filter, X } from "lucide-react";
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
                    <div className="space-y-4">
                        {expiringWPs.length === 0 && (
                            <p className="text-sm text-muted-foreground italic">No hay renovaciones pendientes en el periodo seleccionado.</p>
                        )}
                        {expiringWPs.map((wp) => (
                            <RenewalRow key={wp.id} wp={wp} />
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function RenewalRow({ wp }: { wp: any }) {
    const isAuto = wp.renewalType?.toUpperCase() === 'AUTO';
    const lastPeriod = wp.validityPeriods[0];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today
    const endDate = new Date(lastPeriod.endDate);
    endDate.setHours(0, 0, 0, 0);

    const diffTime = endDate.getTime() - today.getTime();
    const daysLeft = Math.ceil(diffTime / (1000 * 3600 * 24));

    let badgeColor = "bg-green-100 text-green-800";
    let badgeText = `${daysLeft} días restantes`;

    if (daysLeft < 0) {
        badgeColor = "bg-gray-200 text-gray-800 border-gray-400 font-bold";
        badgeText = `Expirado hace ${Math.abs(daysLeft)} días`;
    } else if (daysLeft < 15) {
        badgeColor = "bg-red-100 text-red-800 border-red-200";
    } else if (daysLeft < 45) {
        badgeColor = "bg-yellow-100 text-yellow-800 border-yellow-200";
    }

    return (
        <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors">
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <span className="font-semibold">{wp.client.name}</span>
                    <Badge variant="outline" className="text-xs">{wp.id}</Badge>
                </div>
                <div className="text-sm font-medium">{wp.name}</div>
                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                        <Badge variant="outline" className="font-normal">{wp.contractType}</Badge>
                    </div>
                    <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Vence: {lastPeriod ? formatDate(lastPeriod.endDate, { year: 'numeric', month: '2-digit', day: '2-digit' }) : 'N/A'}
                    </div>
                    <Badge className={badgeColor} variant="secondary">
                        {badgeText}
                    </Badge>
                    <Badge variant={isAuto ? "default" : "secondary"} className={isAuto ? "bg-blue-100 text-blue-800 border-blue-200" : "bg-orange-100 text-orange-800 border-orange-200"}>
                        {isAuto ? "Auto" : "Bajo Pedido"}
                    </Badge>
                </div>
            </div>

            <div className="flex items-center gap-3">
                {isAuto && (
                    <form action={async (formData: FormData) => {
                        "use server";
                        const ipc = formData.get("ipc") ? parseFloat(formData.get("ipc") as string) : 2.5;
                        await renewWorkPackageAuto(wp.id, ipc);
                    }} className="flex items-center border-r pr-3 gap-2">
                        <div className="flex items-center gap-2">
                            <div className="flex flex-col items-end mr-2">
                                <span className="text-[10px] uppercase text-muted-foreground">Inc. IPC %</span>
                                <input
                                    name="ipc"
                                    type="number"
                                    step="0.1"
                                    defaultValue="2.5"
                                    className="w-14 h-8 text-sm border rounded px-2 text-right"
                                />
                            </div>
                            <SubmitButton
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
                                loadingText="Renovando..."
                            >
                                <RefreshCcw className="w-4 h-4 mr-2" />
                                Renovación Auto + IPC
                            </SubmitButton>
                        </div>
                    </form>
                )}

                <form action={async () => {
                    "use server";
                    await cancelWorkPackageRenewal(wp.id);
                }}>
                    <SubmitButton variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700">
                        <X className="w-4 h-4 mr-2" />
                        No renueva
                    </SubmitButton>
                </form>

                <Link href={`/admin/work-packages/${wp.id}/edit?returnTo=/admin/renewals`}>
                    <Button size="sm" variant="outline" className="whitespace-nowrap">
                        Nuevas Condiciones
                    </Button>
                </Link>
            </div>
        </div>
    );
}
