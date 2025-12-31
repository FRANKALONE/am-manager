import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function getNowSpain(): Date {
    // Current time in Spain timezone
    const now = new Date();
    const spainTime = now.toLocaleString("en-US", { timeZone: "Europe/Madrid" });
    return new Date(spainTime);
}

export function getStartOfTodaySpain(): Date {
    // Return today at 00:00:00 in Spain timezone
    const nowSpain = getNowSpain();
    nowSpain.setHours(0, 0, 0, 0);
    return nowSpain;
}
