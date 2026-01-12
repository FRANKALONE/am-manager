import { getDashboardClients } from "@/app/actions/dashboard";
import { DashboardView } from "./components/dashboard-view";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { getCurrentUser, getAuthSession, getHomeUrl } from "@/lib/auth";
import { getTranslations } from "@/lib/get-translations";

import { SharedHeader } from "@/app/components/shared-header";
import { Footer } from "@/app/components/footer";

export default async function DashboardPage() {
    const user = await getCurrentUser();
    const session = await getAuthSession();
    const perms = session?.permissions || {};
    const isAdmin = session?.userRole === 'ADMIN' || session?.userRole === 'GERENTE';

    const clients = await getDashboardClients();
    const { t } = await getTranslations();

    // Calculate user's premium status
    const { getUsers } = await import("@/app/actions/users");
    const users = await getUsers({ email: user?.email });
    const currentUser = users.find(u => u.id === user?.id);
    const isPremium = currentUser?.isPremium || false;

    // Determine home URL based on role/permissions
    const homeUrl = await getHomeUrl();

    return (
        <>
            <SharedHeader title={t('dashboard.title')} />
            <main className="container mx-auto py-8 px-4 md:px-6 flex-1">
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-2">
                            <h2 className="text-2xl font-bold tracking-tight">{t('dashboard.title')}</h2>
                            <p className="text-muted-foreground">
                                {t('dashboard.subtitle')}
                            </p>
                        </div>
                        <Link href={homeUrl}>
                            <Button variant="outline" size="sm">
                                <Home className="w-4 h-4 mr-2" />
                                {t('dashboard.backHome')}
                            </Button>
                        </Link>
                    </div>

                    <DashboardView clients={clients} permissions={perms} userId={user?.id || ""} isAdmin={isAdmin} isPremium={isPremium} />
                </div>
            </main>
            <Footer />
        </>
    );
}
