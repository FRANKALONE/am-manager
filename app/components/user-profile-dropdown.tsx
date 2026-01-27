"use client";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, LogOut, BookOpen, UserCircle, Settings } from "lucide-react";
import { logout } from "@/app/actions/users";
import Link from "next/link";
import { useTranslations } from "@/lib/use-translations";

interface UserProfileDropdownProps {
    user: {
        name: string;
        surname?: string;
        email: string;
        role: string;
    };
}

export function UserProfileDropdown({ user }: UserProfileDropdownProps) {
    const { t } = useTranslations();
    const initials = `${user.name.charAt(0)}${user.surname?.charAt(0) || ""}`.toUpperCase();

    const handleLogout = async () => {
        await logout();
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full border-2 border-slate-200 hover:border-malachite transition-all p-0">
                    <Avatar className="h-full w-full">
                        <AvatarFallback className="bg-slate-100 text-slate-700 font-bold group-hover:bg-malachite group-hover:text-white transition-colors">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.name} {user.surname}</p>
                        <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                        <div className="mt-2">
                            <span className="inline-flex items-center rounded-full bg-malachite/10 px-2 py-0.5 text-xs font-medium text-jade">
                                {user.role}
                            </span>
                        </div>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href="/preferences" className="cursor-pointer flex items-center">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>{t('user.preferences')}</span>
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => {
                        window.dispatchEvent(new CustomEvent('start-onboarding-tour'));
                    }}
                    className="cursor-pointer flex items-center"
                >
                    <BookOpen className="mr-2 h-4 w-4" />
                    <span>Iniciar Guía</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer focus:text-red-600 focus:bg-red-50">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{t('auth.logout')}</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
