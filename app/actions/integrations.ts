"use server";

import { fetchTempo } from "@/lib/tempo";
import { fetchJira } from "@/lib/jira";

export async function testTempoConnection() {
    try {
        // Simple call to get current user or permissions, or just search with minimal range
        // v4/accounts or v4/customers are simple gets
        // Let's try to get customers, usually light.
        // Or "myself" equivalent? Tempo doesn't have a direct "me".
        // Let's try searching worklogs for today (even if empty, 200 OK confirms auth).

        const today = new Date().toISOString().split('T')[0];

        const data = await fetchTempo("/worklogs/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                from: today,
                to: today,
                limit: 1
            })
        });

        return { success: true, message: "Conexión con Tempo exitosa", data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function testJiraConnection() {
    try {
        // Simple call to verify connection. /myself is good for verifying "who am I"
        const response = await fetchJira("/myself");
        return { success: true, data: response };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
