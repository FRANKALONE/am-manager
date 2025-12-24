import { SharedHeader } from "@/app/components/shared-header";

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
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <SharedHeader title="Dashboard AM Clientes" />
            <main>
                {children}
            </main>
        </div>
    );
}
