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
    return <>{children}</>;
}
