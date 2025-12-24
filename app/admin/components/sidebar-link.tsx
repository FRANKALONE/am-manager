"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SidebarLink({ href, label, children }: { href: string; label: string; children?: React.ReactNode }) {
    const pathname = usePathname();
    const isActive = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

    return (
        <Link
            href={href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-gray-900 dark:hover:text-gray-50 ${isActive
                ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-50"
                : "text-gray-500 dark:text-gray-400"
                }`}
        >
            {children}
            {label}
        </Link>
    );
}
