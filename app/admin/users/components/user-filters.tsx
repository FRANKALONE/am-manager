"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useTranslations } from "@/lib/use-translations";
import { Search, X } from "lucide-react";

type Props = {
    clients: { id: string; name: string }[];
};

export function UserFilters({ clients }: Props) {
    const { t } = useTranslations();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // State initialized from URL
    const [email, setEmail] = useState(searchParams.get("email") || "");
    const [role, setRole] = useState(searchParams.get("role") || "ALL");
    const [clientId, setClientId] = useState(searchParams.get("clientId") || "ALL");
    const [lastLoginFrom, setLastLoginFrom] = useState(searchParams.get("lastLoginFrom") || "");
    const [lastLoginTo, setLastLoginTo] = useState(searchParams.get("lastLoginTo") || "");

    // Auto-apply filters when they change
    useEffect(() => {
        const params = new URLSearchParams(searchParams.toString());

        if (email) params.set("email", email);
        else params.delete("email");

        if (role !== "ALL") params.set("role", role);
        else params.delete("role");

        if (clientId !== "ALL") params.set("clientId", clientId);
        else params.delete("clientId");

        if (lastLoginFrom) params.set("lastLoginFrom", lastLoginFrom);
        else params.delete("lastLoginFrom");

        if (lastLoginTo) params.set("lastLoginTo", lastLoginTo);
        else params.delete("lastLoginTo");

        // Small debounce for email input could be added here if needed, 
        // but for now let's keep it simple or use a manual Apply button if email causes too many refreshes.
        const timer = setTimeout(() => {
            router.replace(`${pathname}?${params.toString()}`);
        }, email ? 500 : 0);

        return () => clearTimeout(timer);
    }, [email, role, clientId, lastLoginFrom, lastLoginTo, pathname, router, searchParams]);

    const clearFilters = () => {
        setEmail("");
        setRole("ALL");
        setClientId("ALL");
        setLastLoginFrom("");
        setLastLoginTo("");
    };

    return (
        <div className="bg-muted/50 p-4 rounded-md space-y-4 mb-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold">{t('common.filter')}</h3>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-8 text-xs"
                >
                    <X className="w-3 h-3 mr-1" />
                    {t('users.filters.clear')}
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-4 sm:grid-cols-2">
                {/* Email Filter */}
                <div className="space-y-1">
                    <Label className="text-xs">{t('users.filters.email')}</Label>
                    <Input
                        placeholder="example@mail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-9"
                    />
                </div>

                {/* Role Filter */}
                <div className="space-y-1">
                    <Label className="text-xs">{t('users.filters.role')}</Label>
                    <select
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                    >
                        <option value="ALL">{t('users.filters.allRoles')}</option>
                        <option value="ADMIN">{t('users.roles.ADMIN')}</option>
                        <option value="MANAGER">{t('users.roles.MANAGER')}</option>
                        <option value="GESTOR">{t('users.roles.GESTOR')}</option>
                        <option value="VIEWER">{t('users.roles.VIEWER')}</option>
                        <option value="CLIENT">{t('users.roles.CLIENT')}</option>
                        <option value="CLIENTE">{t('users.roles.CLIENTE')}</option>
                    </select>
                </div>

                {/* Client Filter */}
                <div className="space-y-1">
                    <Label className="text-xs">{t('users.filters.client')}</Label>
                    <select
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                    >
                        <option value="ALL">{t('users.filters.allClients')}</option>
                        {clients.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                {/* Last Login Date Range */}
                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <Label className="text-xs">{t('users.filters.lastLoginFrom')}</Label>
                        <Input
                            type="date"
                            value={lastLoginFrom}
                            onChange={(e) => setLastLoginFrom(e.target.value)}
                            className="h-9"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">{t('users.filters.lastLoginTo')}</Label>
                        <Input
                            type="date"
                            value={lastLoginTo}
                            onChange={(e) => setLastLoginTo(e.target.value)}
                            className="h-9"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
