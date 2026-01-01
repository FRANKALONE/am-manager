import { SharedHeader } from "@/app/components/shared-header";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart3, FileCheck, Settings, Calendar } from "lucide-react";
import { cookies } from "next/headers";
import { getPermissionsByRoleName } from "@/lib/permissions";

export default async function AdminHomePage() {
    const userRole = cookies().get("user_role")?.value || "";
    const perms = await getPermissionsByRoleName(userRole);

    const options = [
        {
            title: "Dashboard Consumos",
            description: "Visualiza y analiza el consumo de Work Packages",
            icon: BarChart3,
            href: "/dashboard",
            color: "from-blue-500 to-blue-600",
            visible: perms.view_dashboard
        },
        {
            title: "Gestión de Cierres",
            description: "Administra los cierres mensuales de Work Packages",
            icon: FileCheck,
            href: "/cierres",
            color: "from-green-500 to-green-600",
            visible: perms.view_cierres
        },
        {
            title: "Gestión de Evolutivos",
            description: "Seguimiento de hitos, responsables y planificación",
            icon: Calendar,
            href: "/dashboard/evolutivos",
            color: "from-orange-500 to-orange-600",
            visible: perms.view_dashboard
        },
        {
            title: "Panel de Administración",
            description: "Gestiona usuarios, clientes, WPs y configuración",
            icon: Settings,
            href: "/admin/clients", // Changed to /admin/clients as a better starting point
            color: "from-purple-500 to-purple-600",
            visible: perms.manage_users || perms.manage_clients || perms.manage_wps || perms.manage_roles
        }
    ].filter(o => o.visible);

    return (
        <div className="min-h-screen bg-slate-50">
            <SharedHeader title="Inicio" />

            <div className="max-w-6xl mx-auto py-16 px-8">
                <div className="mb-12 text-center">
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-dark-green to-malachite mb-2">
                        Bienvenido al Control de Gestión AM
                    </h1>
                    <p className="text-xl text-gray-500">
                        Selecciona un área de trabajo para comenzar
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
                                            Acceder al módulo <span className="ml-2">→</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        );
                    })}

                    {options.length === 0 && (
                        <div className="col-span-full text-center p-12 bg-white rounded-xl shadow-inner border border-dashed border-gray-300">
                            <p className="text-gray-500 text-lg">No tienes permisos asignados para acceder a ningún módulo.</p>
                            <p className="text-gray-400 text-sm mt-2">Contacta con un administrador para revisar tu perfil.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
