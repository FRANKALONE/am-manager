"use client";

import { useState, useEffect } from "react";
import { Bell, Check, MessageSquare } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
    getMyNotifications,
    getUnreadNotificationsCount,
    markNotificationAsRead,
    markAllNotificationsAsRead
} from "@/app/actions/notifications";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import * as locales from "date-fns/locale";
import { useTranslations } from "@/lib/use-translations";
import { formatDate } from "@/lib/date-utils";

interface NotificationPanelProps {
    userId: string;
}

export function NotificationPanel({ userId }: NotificationPanelProps) {
    const { locale } = useTranslations();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);

    const fetchNotifications = async () => {
        const [data, count] = await Promise.all([
            getMyNotifications(userId),
            getUnreadNotificationsCount(userId)
        ]);
        setNotifications(data);
        setUnreadCount(count);
    };

    useEffect(() => {
        if (userId) {
            fetchNotifications();
            // Poll every 30 seconds
            const interval = setInterval(fetchNotifications, 30000);
            return () => clearInterval(interval);
        }
    }, [userId]);

    const handleMarkAsRead = async (id: string) => {
        await markNotificationAsRead(id);
        fetchNotifications();
    };

    const handleMarkAllAsRead = async () => {
        await markAllNotificationsAsRead(userId);
        fetchNotifications();
    };

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] rounded-full border-2 border-background"
                        >
                            {unreadCount}
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between p-4 border-b">
                    <h4 className="font-semibold">Notificaciones</h4>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 text-xs text-primary hover:bg-transparent"
                            onClick={handleMarkAllAsRead}
                        >
                            Marcar todas como leídas
                        </Button>
                    )}
                </div>
                <ScrollArea className="h-80">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                            <MessageSquare className="h-8 w-8 text-muted-foreground mb-2 opacity-20" />
                            <p className="text-sm text-muted-foreground">No tienes notificaciones</p>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {notifications.map((n) => (
                                <div
                                    key={n.id}
                                    className={`p-4 border-b last:border-0 transition-colors hover:bg-muted/30 ${!n.isRead ? 'bg-primary/5' : ''}`}
                                >
                                    <div className="flex justify-between gap-2 mb-1">
                                        <p className={`text-sm font-medium ${!n.isRead ? 'text-primary' : ''}`}>{n.title}</p>
                                        {!n.isRead && (
                                            <button
                                                onClick={() => handleMarkAsRead(n.id)}
                                                className="text-muted-foreground hover:text-primary transition-colors"
                                                title="Marcar como leída"
                                            >
                                                <Check className="h-3 w-3" />
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{n.message}</p>
                                    <p className="text-[10px] text-muted-foreground">
                                        {formatDistanceToNow(new Date(n.createdAt), {
                                            addSuffix: true,
                                            locale: (locales as any)[locale === 'en' ? 'enUS' : locale] || locales.es
                                        })}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
