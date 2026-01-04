import { SharedHeader } from "@/app/components/shared-header";
import { Footer } from "@/app/components/footer";
import { getTranslations } from "@/lib/get-translations";

export const metadata = {
    title: "Dashboard AM Clientes",
    description: "Portal de cliente para seguimiento de consumos",
};

export default async function ClientDashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { t } = await getTranslations();

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
            <SharedHeader title={t('dashboard.clientTitle')} />
            <main className="flex-1">
                {children}
            </main>
            <Footer />
        </div>
    );
}
