import type { Metadata } from "next";
import { Anek_Latin, DM_Sans } from "next/font/google"; // Restore fonts
import "./globals.css";

const anekLatin = Anek_Latin({
    subsets: ["latin"],
    variable: "--font-anek",
});

const dmSans = DM_Sans({
    subsets: ["latin"],
    variable: "--font-dm",
});

export const metadata: Metadata = {
    title: "Manager AM",
    description: "Gestión de clientes y contratos AM",
};

import { getLocale } from "@/lib/get-locale";
import { Toaster } from "sonner";
import { getCurrentUser } from "@/lib/auth";
import { OnboardingTour } from "./components/tour/onboarding-tour";

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const locale = getLocale();
    const user = (await getCurrentUser()) as any;

    return (
        <html lang={locale}>
            <body className={`${anekLatin.variable} ${dmSans.variable} font-sans antialiased text-slate-900`}>
                {children}
                {user && (
                    <OnboardingTour
                        userId={user.id}
                        hasCompletedTour={user.hasCompletedTour}
                    />
                )}
                <Toaster position="top-right" richColors />
            </body>
        </html>
    );
}
