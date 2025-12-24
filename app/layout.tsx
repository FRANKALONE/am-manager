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

import { Toaster } from "sonner";

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="es">
            <body className={`${anekLatin.variable} ${dmSans.variable} font-sans antialiased text-slate-900`}>
                {children}
                <Toaster position="top-right" richColors />
            </body>
        </html>
    );
}
