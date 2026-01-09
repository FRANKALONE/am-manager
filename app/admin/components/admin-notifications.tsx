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

import {
    getMyNotifications,
    getUnreadNotificationsCount,
    markNotificationAsRead,
    markAllNotificationsAsRead
} from "@/app/actions/notifications";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Check } from "lucide-react";

interface AdminNotificationsProps {
    userId: string;
}

export function AdminNotifications({ userId }: AdminNotificationsProps) {
    const { t, locale } = useTranslations();
    const [requests, setRequests] = useState<any[]>([]);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("requests");

    const dateLocale = locale === 'es' ? es : enGB;

    const fetchData = async () => {
        try {
            const [reqData, notifData, count] = await Promise.all([
                getPendingReviewRequests(),
                getMyNotifications(userId),
                getUnreadNotificationsCount(userId)
            ]);
            setRequests(reqData);
            setNotifications(notifData);
            setUnreadCount(count);
        } catch (error) {
            console.error("Error fetching admin data:", error);
        }
    };

    useEffect(() => {
        if (userId) {
            fetchData();
            const interval = setInterval(fetchData, 60000);
            return () => clearInterval(interval);
        }
    }, [userId]);

    const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        await markNotificationAsRead(id);
        fetchData();
    };

    const totalCount = requests.length + unreadCount;

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {totalCount > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] rounded-full border-2 border-background"
                        >
                            {totalCount}
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0 overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b bg-slate-50/50">
                    <h4 className="font-bold text-sm text-slate-800">{t('admin.notifications.title')}</h4>
                </div>

                <Tabs className="w-full">
                    <TabsList className="w-full grid grid-cols-2 rounded-none h-10 bg-slate-100/50">
                        <TabsTrigger
                            value="requests"
                            active={activeTab === 'requests'}
                            onClick={() => setActiveTab('requests')}
                            className="text-xs relative"
                        >
                            Reclamaciones
                            {requests.length > 0 && (
                                <span className="ml-1.5 px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-bold">
                                    {requests.length}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger
                            value="system"
                            active={activeTab === 'system'}
                            onClick={() => setActiveTab('system')}
                            className="text-xs relative"
                        >
                            Notificaciones
                            {unreadCount > 0 && (
                                <span className="ml-1.5 px-1.5 py-0.5 bg-malachite/20 text-malachite-dark rounded-full text-[10px] font-bold">
                                    {unreadCount}
                                </span>
                            )}
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="requests" active={activeTab === 'requests'} className="m-0 border-none outline-none">
                        <ScrollArea className="h-80">
                            {requests.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-8 text-center h-40">
                                    <MessageSquare className="h-8 w-8 text-slate-200 mb-2" />
                                    <p className="text-xs text-slate-400">{t('admin.notifications.empty')}</p>
                                </div>
                            ) : (
                                <div className="flex flex-col">
                                    {requests.map((r) => (
                                        <Link
                                            key={r.id}
                                            href="/admin/review-requests"
                                            onClick={() => setIsOpen(false)}
                                            className="p-4 border-b last:border-0 transition-colors hover:bg-slate-50 block"
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
                                                    {r.workPackage.clientName}
                                                </p>
                                                <p className="text-[10px] text-slate-400">
                                                    {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true, locale: dateLocale })}
                                                </p>
                                            </div>
                                            <p className="text-xs font-semibold text-slate-700 mb-1">
                                                {r.workPackage.name}
                                            </p>
                                            <p className="text-xs text-slate-500 line-clamp-2 italic bg-slate-50 p-2 rounded border border-slate-100">
                                                "{r.reason}"
                                            </p>
                                            <p className="text-[10px] text-slate-400 mt-2">
                                                {t('admin.notifications.from', { name: `${r.requestedByUser.name} ${r.requestedByUser.surname}` })}
                                            </p>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                        <div className="p-2 bg-slate-50 border-t">
                            <Link href="/admin/review-requests" onClick={() => setIsOpen(false)}>
                                <Button variant="ghost" size="sm" className="w-full text-[11px] font-bold text-slate-500 hover:text-indigo-600">
                                    {t('admin.notifications.viewAll')}
                                </Button>
                            </Link>
                        </div>
                    </TabsContent>

                    <TabsContent value="system" active={activeTab === 'system'} className="m-0 border-none outline-none">
                        <ScrollArea className="h-80">
                            {notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-8 text-center h-40">
                                    <Bell className="h-8 w-8 text-slate-200 mb-2" />
                                    <p className="text-xs text-slate-400">No hay avisos del sistema</p>
                                </div>
                            ) : (
                                <div className="flex flex-col">
                                    {notifications.map((n) => (
                                        <div
                                            key={n.id}
                                            className={`p-4 border-b last:border-0 transition-colors hover:bg-slate-50 ${!n.isRead ? 'bg-malachite/5' : ''}`}
                                        >
                                            <div className="flex justify-between gap-2 mb-1">
                                                <p className={`text-xs font-bold ${!n.isRead ? 'text-malachite-dark' : 'text-slate-700'}`}>
                                                    {n.title}
                                                </p>
                                                {!n.isRead && (
                                                    <button
                                                        onClick={(e) => handleMarkAsRead(n.id, e)}
                                                        className="text-slate-400 hover:text-malachite transition-colors"
                                                        title="Marcar como leída"
                                                    >
                                                        <Check className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 mb-2 line-clamp-3">{n.message}</p>
                                            <p className="text-[10px] text-slate-400 italic">
                                                {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: dateLocale })}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                        {notifications.length > 0 && unreadCount > 0 && (
                            <div className="p-2 bg-slate-50 border-t">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full text-[11px] font-bold text-slate-500 hover:text-malachite"
                                    onClick={async () => {
                                        await markAllNotificationsAsRead(userId);
                                        fetchData();
                                    }}
                                >
                                    Marcar todas como leídas
                                </Button>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
