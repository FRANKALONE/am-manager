import Link from "next/link";
import Image from "next/image";
import { Home } from "lucide-react";
import { cookies } from "next/headers";
import { hasPermission } from "@/lib/permissions";
import { getMe } from "@/app/actions/users";
import { UserProfileDropdown } from "./user-profile-dropdown";
import { AdminNotifications } from "@/app/admin/components/admin-notifications";
import { NotificationPanel } from "@/app/dashboard/components/notification-panel";
import { getTranslations } from "@/lib/get-translations";

interface SharedHeaderProps {
    title: string;
}

export async function SharedHeader({ title }: SharedHeaderProps) {
    const userRole = cookies().get("user_role")?.value || "";
    const user = await getMe();
    const canSeeDashboard = await hasPermission(userRole, "view_dashboard");
    const { t } = await getTranslations();

    return (
        <header className="bg-white dark:bg-slate-900 border-b px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
            <div className="flex items-center gap-6">
                <Link href={userRole === "ADMIN" ? "/admin-home" : (userRole === "GERENTE" ? "/manager-dashboard" : "/client-dashboard")}>
                    <Image
                        src="/logo-am.png"
                        alt="Manager AM"
                        width={100}
                        height={40}
                        className="hover:opacity-80 transition-opacity"
                    />
                </Link>
                <div className="h-6 w-px bg-slate-200 hidden md:block" />
                <h1 className="text-xl font-bold text-dark-green hidden md:block">
                    {title}
                </h1>
            </div>
            <div className="flex items-center gap-4">
                {canSeeDashboard && (
                    <Link href={userRole === "ADMIN" ? "/admin-home" : (userRole === "GERENTE" ? "/manager-dashboard" : "/client-dashboard")} className="text-sm font-semibold text-slate-600 hover:text-malachite flex items-center gap-2 transition-colors mr-2">
                        <Home className="w-4 h-4" /> {t('common.home')}
                    </Link>
                )}

                {/* Notifications based on role */}
                {userRole === "ADMIN" ? (
                    <AdminNotifications />
                ) : user ? (
                    <NotificationPanel userId={user.id} />
                ) : null}

                {/* Profile dropdown if user is logged in */}
                {user && <UserProfileDropdown user={user as any} />}
            </div>
        </header>
    );
}
