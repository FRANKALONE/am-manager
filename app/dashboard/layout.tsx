import { Inter } from "next/font/google";
import "@/app/globals.css";
import { cn } from "@/utils";

import { SharedHeader } from "@/app/components/shared-header";
import { Footer } from "@/app/components/footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
    title: "Dashboard de Consumos",
    description: "Sistema de Gestión de Consumos AM",
};

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className={cn("min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col", inter.className)}>
            <SharedHeader title="Dashboard de Consumos" />

            <main className="container mx-auto py-8 px-4 md:px-6 flex-1">
                {children}
            </main>
            <Footer />
        </div>
    );
}
