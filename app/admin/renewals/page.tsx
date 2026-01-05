import Link from "next/link";
import { formatDate } from "@/lib/date-utils";
import { getMe } from "@/app/actions/users";
import { getExpiringWPs, renewWorkPackageAuto, checkContractExpirations } from "@/app/actions/contract-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, RefreshCcw, Bell } from "lucide-react";
import { redirect } from "next/navigation";
import { SubmitButton } from "@/components/submit-button";

export default async function RenewalsPage() {
    const user = await getMe();
    if (!user || (user.role !== 'ADMIN' && user.role !== 'GERENTE')) {
        redirect("/login");
    }

    const isGerente = user.role === 'GERENTE';
    const expiringWPs = await getExpiringWPs(isGerente ? user.id : undefined);

    // Sort by proximity
    expiringWPs.sort((a, b) => {
        const dateA = a.validityPeriods[0]?.endDate ? new Date(a.validityPeriods[0].endDate).getTime() : Infinity;
        const dateB = b.validityPeriods[0]?.endDate ? new Date(b.validityPeriods[0].endDate).getTime() : Infinity;
        return dateA - dateB;
    });

    // Filter into groups
    const autoRenewals = expiringWPs.filter(wp => wp.renewalType?.toUpperCase() === 'AUTO');
    const manualRenewals = expiringWPs.filter(wp => wp.renewalType?.toUpperCase() !== 'AUTO');

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

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Renovaciones Automáticas</CardTitle>
                        <CardDescription>
                            Work Packages configurados para renovación automática con IPC.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {autoRenewals.length === 0 && (
                                <p className="text-sm text-muted-foreground italic">No hay renovaciones automáticas pendientes.</p>
                            )}
                            {autoRenewals.map((wp) => (
                                <RenewalRow key={wp.id} wp={wp} isAuto={true} />
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Renovaciones Manuales</CardTitle>
                        <CardDescription>
                            Requieren negociación o cambio de condiciones.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {manualRenewals.length === 0 && (
                                <p className="text-sm text-muted-foreground italic">No hay renovaciones manuales pendientes.</p>
                            )}
                            {manualRenewals.map((wp) => (
                                <RenewalRow key={wp.id} wp={wp} isAuto={false} />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function RenewalRow({ wp, isAuto }: { wp: any, isAuto: boolean }) {
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
                        <Calendar className="w-3 h-3" />
                        Vence: {lastPeriod ? formatDate(lastPeriod.endDate, { year: 'numeric', month: '2-digit', day: '2-digit' }) : 'N/A'}
                    </div>
                    <Badge className={badgeColor} variant="secondary">
                        {badgeText}
                    </Badge>
                </div>
            </div>

            <div className="flex gap-2">
                {isAuto ? (
                    <form action={async (formData: FormData) => {
                        "use server";
                        const ipc = formData.get("ipc") ? parseFloat(formData.get("ipc") as string) : 2.5; // Default 2.5% or per prompt
                        await renewWorkPackageAuto(wp.id, ipc);
                    }}>
                        <div className="flex items-center gap-2">
                            <div className="flex flex-col items-end mr-2">
                                <span className="text-[10px] uppercase text-muted-foreground">Incremento IPC %</span>
                                <input
                                    name="ipc"
                                    type="number"
                                    step="0.1"
                                    defaultValue="2.5"
                                    className="w-16 h-8 text-sm border rounded px-2 text-right"
                                />
                            </div>
                            <SubmitButton
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700"
                                loadingText="Renovando..."
                            >
                                <RefreshCcw className="w-4 h-4 mr-2" />
                                Renovar
                            </SubmitButton>
                        </div>
                    </form>
                ) : (
                    <Link href={`/admin/work-packages/${wp.id}/edit`}>
                        <Button size="sm" variant="outline">
                            Gestionar Manual
                        </Button>
                    </Link>
                )}
            </div>
        </div>
    );
}
