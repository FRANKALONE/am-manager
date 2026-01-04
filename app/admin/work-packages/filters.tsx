"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useTranslations } from "@/lib/use-translations";

type Props = {
    clients: { id: string; name: string }[];
    contractTypes: { value: string; label: string }[];
    renewalTypes: { value: string; label: string }[];
};

export function WorkPackageFilters({ clients, contractTypes, renewalTypes }: Props) {
    const { t } = useTranslations();
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
        const params = new URLSearchParams(searchParams.toString());

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
                <h3 className="text-sm font-semibold">{t('workPackages.filter.title')}</h3>
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
                    {t('workPackages.filter.clear')}
                </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-5">

                {/* Client Filter */}
                <div className="space-y-1">
                    <Label className="text-xs">{t('workPackages.filter.client')}</Label>
                    <select
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                    >
                        <option value="">{t('workPackages.filter.all')}</option>
                        {clients.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                {/* Contract Type Filter */}
                <div className="space-y-1">
                    <Label className="text-xs">{t('workPackages.filter.contractType')}</Label>
                    <select
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
                        value={contractType}
                        onChange={(e) => setContractType(e.target.value)}
                    >
                        <option value="">{t('workPackages.filter.all')}</option>
                        {contractTypes.map(c => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                    </select>
                </div>

                {/* Renewal Type Filter */}
                <div className="space-y-1">
                    <Label className="text-xs">{t('workPackages.filter.renewal')}</Label>
                    <select
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
                        value={renewalType}
                        onChange={(e) => setRenewalType(e.target.value)}
                    >
                        <option value="">{t('workPackages.filter.all')}</option>
                        {renewalTypes.map(c => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                    </select>
                </div>

                {/* Premium Filter */}
                <div className="space-y-1">
                    <Label className="text-xs">{t('workPackages.filter.premium')}</Label>
                    <select
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
                        value={isPremium}
                        onChange={(e) => setIsPremium(e.target.value)}
                    >
                        <option value="all">{t('workPackages.filter.all')}</option>
                        <option value="true">{t('workPackages.filter.yes')}</option>
                        <option value="false">{t('workPackages.filter.no')}</option>
                    </select>
                </div>

                {/* Status Filter */}
                <div className="space-y-1">
                    <Label className="text-xs">{t('workPackages.filter.status')}</Label>
                    <select
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                    >
                        <option value="active">{t('workPackages.filter.active')}</option>
                        <option value="inactive">{t('workPackages.filter.inactive')}</option>
                        <option value="all">{t('workPackages.filter.all')}</option>
                    </select>
                </div>

                {/* Expiration Filter (Month/Year) */}
                <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <Label className="text-xs">{t('workPackages.filter.expMonth')}</Label>
                        <select
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
                            value={month}
                            onChange={(e) => setMonth(e.target.value)}
                        >
                            <option value="">--</option>
                            <option value="0">{t('months.january')}</option>
                            <option value="1">{t('months.february')}</option>
                            <option value="2">{t('months.march')}</option>
                            <option value="3">{t('months.april')}</option>
                            <option value="4">{t('months.may')}</option>
                            <option value="5">{t('months.june')}</option>
                            <option value="6">{t('months.july')}</option>
                            <option value="7">{t('months.august')}</option>
                            <option value="8">{t('months.september')}</option>
                            <option value="9">{t('months.october')}</option>
                            <option value="10">{t('months.november')}</option>
                            <option value="11">{t('months.december')}</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">{t('workPackages.filter.expYear')}</Label>
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
