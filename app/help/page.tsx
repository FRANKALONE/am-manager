import { getMe } from "@/app/actions/users";
import { getPermissionsByRoleName } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { HelpView } from "./help-view";
import { SharedHeader } from "@/app/components/shared-header";
import { getTranslations } from "@/lib/get-translations";

export default async function HelpPage() {
    const user = await getMe();
    if (!user) redirect("/login");

    const permissions = await getPermissionsByRoleName(user.role);
    const { t } = await getTranslations();

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 print:bg-white">
            <div className="print:hidden">
                <SharedHeader title={t('help.title')} />
            </div>
            <main className="flex-1">
                <HelpView permissions={permissions} userName={user.name} />
            </main>
        </div>
    );
}
