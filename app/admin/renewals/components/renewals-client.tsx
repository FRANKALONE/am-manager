"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, RefreshCcw, X } from "lucide-react";
import { SubmitButton } from "@/components/submit-button";
import { ContractDetailsModal, SelectedPeriod } from "./contract-details-modal";
import { renewWorkPackageAuto, renewWorkPackageSameConditions, cancelWorkPackageRenewal } from "@/app/actions/contract-actions";

interface RenewalsClientProps {
    expiringWPs: any[];
}

export function RenewalsClient({ expiringWPs }: RenewalsClientProps) {
    const [selectedPeriod, setSelectedPeriod] = useState<SelectedPeriod | null>(null);

    return (
        <div className="space-y-4">
            {expiringWPs.length === 0 && (
                <p className="text-sm text-muted-foreground italic">No hay renovaciones pendientes en el periodo seleccionado.</p>
            )}
            {expiringWPs.map((wp) => (
                <RenewalRow
                    key={wp.id}
                    wp={wp}
                    onShowDetails={() => {
                        const lastPeriod = wp.validityPeriods[0];
                        if (lastPeriod) {
                            setSelectedPeriod({
                                ...lastPeriod,
                                wpName: wp.name,
                                clientName: wp.client.name,
                                renewalType: wp.renewalType,
                                contractType: wp.contractType,
                                billingType: lastPeriod.billingType || wp.billingType || ""
                            });
                        }
                    }}
                />
            ))}

            <ContractDetailsModal
                selectedPeriod={selectedPeriod}
                onClose={() => setSelectedPeriod(null)}
            />
        </div>
    );
}

function RenewalRow({ wp, onShowDetails }: { wp: any, onShowDetails: () => void }) {
    const isAuto = wp.renewalType?.toUpperCase() === 'AUTO';
    const lastPeriod = wp.validityPeriods[0];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
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
                    <Badge
                        variant="outline"
                        className="text-xs cursor-pointer hover:bg-slate-200 transition-colors"
                        onClick={onShowDetails}
                        title="Ver detalles del contrato"
                    >
                        {wp.id}
                    </Badge>
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
                {wp.renewalNotes && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                        <span className="font-semibold text-blue-900">📝 Notas: </span>
                        <span className="text-blue-800">{wp.renewalNotes}</span>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-3">
                {isAuto && (
                    <form action={async (formData: FormData) => {
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
                                    aria-label="Incremento IPC %"
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
                    await renewWorkPackageSameConditions(wp.id);
                }}>
                    <SubmitButton
                        size="sm"
                        variant="outline"
                        className="bg-green-50 text-green-700 border-green-300 hover:bg-green-100 hover:text-green-800 whitespace-nowrap"
                        loadingText="Renovando..."
                    >
                        <RefreshCcw className="w-4 h-4 mr-2" />
                        Renovar Mismas Condiciones
                    </SubmitButton>
                </form>

                <form action={async () => {
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
