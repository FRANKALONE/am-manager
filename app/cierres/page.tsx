import { SharedHeader } from "@/app/components/shared-header";
import { CierresView } from "./components/cierres-view";
import { getTranslations } from "@/lib/get-translations";

export default async function CierresPage() {
    const { t } = await getTranslations();

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <SharedHeader title={t('admin.closures')} />

            <div className="max-w-6xl mx-auto px-4 py-8 md:px-8">
                <div className="mb-8">
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">{t('admin.closures')}</h2>
                    <p className="text-slate-500 mt-1">{t('admin.closuresDesc')}</p>
                </div>

                <CierresView />
            </div>
        </div>
    );
}
