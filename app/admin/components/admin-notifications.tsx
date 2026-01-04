"use client";

import { useState, useEffect } from "react";
import { MessageSquare } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getPendingReviewRequests } from "@/app/actions/review-requests";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { es, enGB } from "date-fns/locale";
import { useTranslations } from "@/lib/use-translations";

export function AdminNotifications() {
    const { t, locale } = useTranslations();
    const [requests, setRequests] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    const dateLocale = locale === 'es' ? es : enGB;

    const fetchRequests = async () => {
        try {
            const data = await getPendingReviewRequests();
            setRequests(data);
        } catch (error) {
            console.error("Error fetching admin notifications:", error);
        }
    };

    useEffect(() => {
        fetchRequests();
        const interval = setInterval(fetchRequests, 60000); // Poll every minute
        return () => clearInterval(interval);
    }, []);

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <MessageSquare className="h-5 w-5" />
                    {requests.length > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] rounded-full border-2 border-background"
                        >
                            {requests.length}
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between p-4 border-b">
                    <h4 className="font-semibold text-sm">{t('admin.notifications.title')}</h4>
                    <Link href="/admin/review-requests" onClick={() => setIsOpen(false)}>
                        <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-primary hover:bg-transparent">
                            {t('admin.notifications.viewAll')}
                        </Button>
                    </Link>
                </div>
                <ScrollArea className="h-64">
                    {requests.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                            <MessageSquare className="h-8 w-8 text-muted-foreground mb-2 opacity-20" />
                            <p className="text-sm text-muted-foreground">{t('admin.notifications.empty')}</p>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {requests.map((r) => (
                                <Link
                                    key={r.id}
                                    href="/admin/review-requests"
                                    onClick={() => setIsOpen(false)}
                                    className="p-4 border-b last:border-0 transition-colors hover:bg-muted/30"
                                >
                                    <p className="text-xs font-semibold text-primary mb-1">
                                        {r.workPackage.clientName} - {r.workPackage.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2 italic">
                                        "{r.reason}"
                                    </p>
                                    <div className="flex justify-between items-center">
                                        <p className="text-[10px] text-muted-foreground">
                                            {t('admin.notifications.from', { name: `${r.requestedByUser.name} ${r.requestedByUser.surname}` })}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground italic">
                                            {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true, locale: dateLocale })}
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
