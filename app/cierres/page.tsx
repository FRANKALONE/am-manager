import { SharedHeader } from "@/app/components/shared-header";
import { CierresView } from "./components/cierres-view";
import { getTranslations } from "@/lib/get-translations";
import { getUserById } from "@/app/actions/users";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function CierresPage() {
    const { t } = await getTranslations();

    const userId = cookies().get("user_id")?.value;
    if (!userId) redirect("/login");

    const user = await getUserById(userId);
    if (!user) redirect("/login");

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <SharedHeader title={t('admin.closures')} />

            <div className="max-w-6xl mx-auto px-4 py-8 md:px-8">
                <div className="mb-8">
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">{t('admin.closures')}</h2>
                    <p className="text-slate-500 mt-1">{t('admin.closuresDesc')}</p>
                </div>

                <CierresView user={{ id: user.id, name: user.name, surname: user.surname || undefined }} />
            </div>
        </div>
    );
}
