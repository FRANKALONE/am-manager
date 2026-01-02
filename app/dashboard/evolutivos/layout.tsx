import { Inter } from "next/font/google";
import "@/app/globals.css";
import { cn } from "@/utils";

import { SharedHeader } from "@/app/components/shared-header";
import { Footer } from "@/app/components/footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
    title: "Gestión de Evolutivos",
    description: "Centro de Gestión de Evolutivos - Seguimiento detallado de hitos y planificación",
};

export default function EvolutivosLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className={cn("min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col", inter.className)}>
            <SharedHeader title="Gestión de Evolutivos" />

            <main className="container mx-auto py-8 px-4 md:px-6 flex-1">
                {children}
            </main>
            <Footer />
        </div>
    );
}
