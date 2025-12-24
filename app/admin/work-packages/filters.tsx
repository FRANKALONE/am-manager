"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useEffect } from "react";

type Props = {
    clients: { id: string; name: string }[];
    contractTypes: { value: string; label: string }[];
    renewalTypes: { value: string; label: string }[];
};

export function WorkPackageFilters({ clients, contractTypes, renewalTypes }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // State initialized from URL
    const [clientId, setClientId] = useState(searchParams.get("clientId") || "");
    const [contractType, setContractType] = useState(searchParams.get("contractType") || "");
    const [renewalType, setRenewalType] = useState(searchParams.get("renewalType") || "");
    const [isPremium, setIsPremium] = useState(searchParams.get("isPremium") || "all");
    const [status, setStatus] = useState(searchParams.get("status") || "active"); // Default active
    const [month, setMonth] = useState(searchParams.get("month") || "");
    const [year, setYear] = useState(searchParams.get("year") || "");

    // Debounce effect or manual apply? Manual apply is often safer for complex filters, but auto-apply is nicer.
    // Let's do auto-apply with a small effect.

    useEffect(() => {
        const params = new URLSearchParams(searchParams);

        if (clientId) params.set("clientId", clientId);
        else params.delete("clientId");

        if (contractType) params.set("contractType", contractType);
        else params.delete("contractType");

        if (renewalType) params.set("renewalType", renewalType);
        else params.delete("renewalType");

        if (isPremium !== "all") params.set("isPremium", isPremium);
        else params.delete("isPremium");

        if (status !== "active") params.set("status", status); // If not default
        else params.delete("status"); // Keep URL clean if default

        if (month) params.set("month", month);
        else params.delete("month");

        if (year) params.set("year", year);
        else params.delete("year");

        router.replace(`${pathname}?${params.toString()}`);
    }, [clientId, contractType, renewalType, isPremium, status, month, year, pathname, router, searchParams]);

    return (
        <div className="bg-muted/50 p-4 rounded-md space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Filtros</h3>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                        setClientId("");
                        setContractType("");
                        setRenewalType("");
                        setIsPremium("all");
                        setStatus("active");
                        setMonth("");
                        setYear("");
                    }}
                >
                    Limpiar
                </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-5">

                {/* Client Filter */}
                <div className="space-y-1">
                    <Label className="text-xs">Cliente</Label>
                    <select
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                    >
                        <option value="">Todos</option>
                        {clients.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                {/* Contract Type Filter */}
                <div className="space-y-1">
                    <Label className="text-xs">Tipo Contrato</Label>
                    <select
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
                        value={contractType}
                        onChange={(e) => setContractType(e.target.value)}
                    >
                        <option value="">Todos</option>
                        {contractTypes.map(c => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                    </select>
                </div>

                {/* Renewal Type Filter */}
                <div className="space-y-1">
                    <Label className="text-xs">Renovación</Label>
                    <select
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
                        value={renewalType}
                        onChange={(e) => setRenewalType(e.target.value)}
                    >
                        <option value="">Todos</option>
                        {renewalTypes.map(c => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                    </select>
                </div>

                {/* Premium Filter */}
                <div className="space-y-1">
                    <Label className="text-xs">Premium</Label>
                    <select
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
                        value={isPremium}
                        onChange={(e) => setIsPremium(e.target.value)}
                    >
                        <option value="all">Todos</option>
                        <option value="true">Sí</option>
                        <option value="false">No</option>
                    </select>
                </div>

                {/* Status Filter */}
                <div className="space-y-1">
                    <Label className="text-xs">Estado Vigencia</Label>
                    <select
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                    >
                        <option value="active">Activos</option>
                        <option value="inactive">Inactivos</option>
                        <option value="all">Todos</option>
                    </select>
                </div>

                {/* Expiration Filter (Month/Year) */}
                <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <Label className="text-xs">Mes Vencimiento</Label>
                        <select
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
                            value={month}
                            onChange={(e) => setMonth(e.target.value)}
                        >
                            <option value="">--</option>
                            <option value="0">Enero</option>
                            <option value="1">Febrero</option>
                            <option value="2">Marzo</option>
                            <option value="3">Abril</option>
                            <option value="4">Mayo</option>
                            <option value="5">Junio</option>
                            <option value="6">Julio</option>
                            <option value="7">Agosto</option>
                            <option value="8">Septiembre</option>
                            <option value="9">Octubre</option>
                            <option value="10">Noviembre</option>
                            <option value="11">Diciembre</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Año Vencimiento</Label>
                        <select
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                        >
                            <option value="">--</option>
                            {[...Array(6)].map((_, i) => {
                                const y = new Date().getFullYear() - 1 + i;
                                return <option key={y} value={y}>{y}</option>
                            })}
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
}
