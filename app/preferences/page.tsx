import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { UserPreferencesForm } from "@/app/components/user-preferences-form";
import { SharedHeader } from "@/app/components/shared-header";
import { getTranslations } from "@/lib/get-translations";

export default async function PreferencesPage() {
    const user = await getCurrentUser();
    const { t } = await getTranslations();

    if (!user) {
        redirect("/login");
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <SharedHeader title={t('preferences.title')} />
            <main className="p-6 max-w-2xl mx-auto">
                <UserPreferencesForm
                    userId={user.id}
                    currentLocale={user.locale || 'es'}
                    currentTimezone={user.timezone || 'Europe/Madrid'}
                />
            </main>
        </div>
    );
}
