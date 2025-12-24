"use client";

import { logout } from "@/app/actions/users";
import { LogOut } from "lucide-react";
import { useState } from "react";

export function LogoutButton() {
    const [isPending, setIsPending] = useState(false);

    const handleLogout = async () => {
        setIsPending(true);
        try {
            await logout();
        } catch (error) {
            console.error("Logout failed:", error);
        } finally {
            setIsPending(false);
        }
    };

    return (
        <button
            onClick={handleLogout}
            disabled={isPending}
            className="text-sm font-semibold text-slate-600 hover:text-red-500 flex items-center gap-2 transition-colors disabled:opacity-50"
        >
            <LogOut className="w-4 h-4" />
            {isPending ? "Saliendo..." : "Salir"}
        </button>
    );
}
