import { AdminSidebar } from "./components/sidebar";
import { SharedHeader } from "@/app/components/shared-header";
import { Footer } from "@/app/components/footer";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Sidebar */}
            <AdminSidebar />

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                <SharedHeader title="Panel Administrativo" />
                <main className="flex-1 p-8">
                    {children}
                </main>
                <Footer />
            </div>
        </div>
    );
}
