import { SharedHeader } from "@/app/components/shared-header";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart3, FileCheck, Settings, Calendar } from "lucide-react";
import { cookies } from "next/headers";
import { getPermissionsByRoleName } from "@/lib/permissions";
import { getTranslations } from "@/lib/get-translations";

export default async function AdminHomePage() {
    const userRole = cookies().get("user_role")?.value || "";
    const perms = await getPermissionsByRoleName(userRole);
    const { t } = await getTranslations();

    const options = [
        {
            title: t('adminHome.dashboardConsumptions'),
            description: t('adminHome.dashboardConsumptionsDesc'),
            icon: BarChart3,
            href: "/dashboard",
            color: "from-blue-500 to-blue-600",
            visible: perms.view_dashboard
        },
        {
            title: t('adminHome.closuresManagement'),
            description: t('adminHome.closuresManagementDesc'),
            icon: FileCheck,
            href: "/cierres",
            color: "from-green-500 to-green-600",
            visible: perms.view_cierres
        },
        {
            title: t('adminHome.evolutivosManagement'),
            description: t('adminHome.evolutivosManagementDesc'),
            icon: Calendar,
            href: "/evolutivos",
            color: "from-orange-500 to-orange-600",
            visible: perms.view_dashboard
        },
        {
            title: t('adminHome.administration'),
            description: t('adminHome.administrationDesc'),
            icon: Settings,
            href: "/admin/clients",
            color: "from-purple-500 to-purple-600",
            visible: perms.manage_users || perms.manage_clients || perms.manage_wps || perms.manage_roles
        }
    ].filter(o => o.visible);

    return (
        <div className="min-h-screen bg-slate-50">
            <SharedHeader title={t('common.home')} />

            <div className="max-w-6xl mx-auto py-16 px-8">
                <div className="mb-12 text-center">
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-dark-green to-malachite mb-2">
                        {t('adminHome.title')}
                    </h1>
                    <p className="text-xl text-gray-500">
                        {t('adminHome.subtitle')}
                    </p>
                </div>

                <div className={`grid grid-cols-1 ${options.length > 1 ? 'md:grid-cols-' + Math.min(3, options.length) : ''} gap-8 max-w-5xl mx-auto`}>
                    {options.map((option) => {
                        const Icon = option.icon;
                        return (
                            <Link key={option.href} href={option.href}>
                                <Card className="h-full hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 cursor-pointer border-2 hover:border-malachite/50 group">
                                    <CardHeader>
                                        <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${option.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg`}>
                                            <Icon className="w-8 h-8 text-white" />
                                        </div>
                                        <CardTitle className="text-2xl text-dark-green">{option.title}</CardTitle>
                                        <CardDescription className="text-base text-gray-500 mt-2">
                                            {option.description}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-sm text-malachite font-bold flex items-center group-hover:translate-x-2 transition-transform">
                                            {t('adminHome.accessModule')} <span className="ml-2">→</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        );
                    })}

                    {options.length === 0 && (
                        <div className="col-span-full text-center p-12 bg-white rounded-xl shadow-inner border border-dashed border-gray-300">
                            <p className="text-gray-500 text-lg">{t('common.noPermissions')}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
