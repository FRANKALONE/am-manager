import { getNotificationSettings } from "@/app/actions/notifications";
import { NotificationsManagerView } from "./notifications-manager-view";

export default async function NotificationsAdminPage() {
    const settings = await getNotificationSettings();

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold text-slate-900">Gestión de Notificaciones</h1>
                <p className="text-slate-500 text-sm">Configura los flujos de notificaciones automáticas del sistema.</p>
            </div>

            <NotificationsManagerView initialSettings={settings} />
        </div>
    );
}
