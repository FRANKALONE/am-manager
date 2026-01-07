import { Inter } from "next/font/google";
import "@/app/globals.css";
import { cn } from "@/utils";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
    title: "Dashboard de Consumos",
    description: "Sistema de Gestión de Consumos AM",
};

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className={cn("min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col", inter.className)}>
            {children}
        </div>
    );
}
