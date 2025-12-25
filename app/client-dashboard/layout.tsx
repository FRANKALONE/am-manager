import { SharedHeader } from "@/app/components/shared-header";
import { Footer } from "@/app/components/footer";

export const metadata = {
    title: "Dashboard AM Clientes",
    description: "Portal de cliente para seguimiento de consumos",
};

export default function ClientDashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
            <SharedHeader title="Dashboard AM Clientes" />
            <main className="flex-1">
                {children}
            </main>
            <Footer />
        </div>
    );
}
