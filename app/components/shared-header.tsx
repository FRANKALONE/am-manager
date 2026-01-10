import Link from "next/link";
import Image from "next/image";
import { Home, Globe } from "lucide-react";
import { getCurrentUser, getAuthSession, hasPermission } from "@/lib/auth";
import { UserProfileDropdown } from "./user-profile-dropdown";
import { AdminNotifications } from "@/app/admin/components/admin-notifications";
import { NotificationPanel } from "@/app/dashboard/components/notification-panel";
import { getTranslations } from "@/lib/get-translations";
import { getActiveLandingsForUser } from "@/app/actions/landings";

interface SharedHeaderProps {
    title: string;
}

export async function SharedHeader({ title }: SharedHeaderProps) {
    const session = await getAuthSession();
    const userRole = session?.userRole || "";
    const user = await getCurrentUser();
    const canSeeDashboard = await hasPermission("view_dashboard");
    const { t } = await getTranslations();

    const activeLandings = user ? await getActiveLandingsForUser(user.id) : [];
    const navLandings = activeLandings.filter(l => l.showInHeader);

    // Determine home link based on role and permissions
    let homeHref = "/client-dashboard";
    if (userRole === "ADMIN") {
        homeHref = "/admin-home";
    } else if (canSeeDashboard) {
        homeHref = "/manager-dashboard";
    }

    return (
        <header className="bg-white dark:bg-slate-900 border-b px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
            <div className="flex items-center gap-6">
                <Link href={homeHref}>
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
                    <Link href={homeHref} className="text-sm font-semibold text-slate-600 hover:text-malachite flex items-center gap-2 transition-colors mr-2">
                        <Home className="w-4 h-4" /> {t('common.home')}
                    </Link>
                )}

                {/* Landing Pages Navigation */}
                {navLandings.length > 0 && (
                    <div className="flex items-center gap-4 border-l pl-4 mr-2">
                        {navLandings.map(landing => (
                            <Link
                                key={landing.id}
                                href={`/landing/${landing.slug}`}
                                className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-blue-600 transition-colors flex items-center gap-1.5"
                            >
                                <Globe className="w-3.5 h-3.5" />
                                {landing.title}
                                {landing.isNew && (
                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" title="Nuevo" />
                                )}
                            </Link>
                        ))}
                    </div>
                )}

                {/* Notifications based on role */}
                {userRole === "ADMIN" ? (
                    <AdminNotifications userId={user?.id || ""} />
                ) : user ? (
                    <NotificationPanel userId={user.id} />
                ) : null}

                {/* Profile dropdown if user is logged in */}
                {user && <UserProfileDropdown user={user as any} />}
            </div>
        </header>
    );
}
