"use client";

import { Inter } from "next/font/google";
import "@/app/globals.css";
import { cn } from "@/utils";
import { usePathname } from "next/navigation";

import { SharedHeader } from "@/app/components/shared-header";
import { Footer } from "@/app/components/footer";

const inter = Inter({ subsets: ["latin"] });

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const isEvolutivos = pathname?.includes('/evolutivos');
    const title = isEvolutivos ? "Gestión de Evolutivos" : "Dashboard de Consumos";

    return (
        <div className={cn("min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col", inter.className)}>
            <SharedHeader title={title} />

            <main className="container mx-auto py-8 px-4 md:px-6 flex-1">
                {children}
            </main>
            <Footer />
        </div>
    );
}
