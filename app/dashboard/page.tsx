import { getDashboardClients } from "@/app/actions/dashboard";
import { DashboardView } from "./components/dashboard-view";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { getPermissionsByRoleName } from "@/lib/permissions";
import { getMe } from "@/app/actions/users";
import { getTranslations } from "@/lib/get-translations";

import { SharedHeader } from "@/app/components/shared-header";
import { Footer } from "@/app/components/footer";

export default async function DashboardPage() {
    const user = await getMe();
    const isManager = user?.role === 'GERENTE';
    const isAdmin = user?.role === 'ADMIN';
    const clients = await getDashboardClients(isManager ? user?.id : undefined);
    const perms = await getPermissionsByRoleName(user?.role || "");
    const { t } = await getTranslations();

    // Determine home URL based on role
    const homeUrl = isAdmin ? '/admin-home' : (isManager ? '/manager-dashboard' : '/client-dashboard');

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

                    <DashboardView clients={clients} permissions={perms} userId={user?.id || ""} isAdmin={isAdmin} />
                </div>
            </main>
            <Footer />
        </>
    );
}
