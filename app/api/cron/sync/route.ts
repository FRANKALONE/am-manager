import { NextRequest, NextResponse } from "next/server";
import { syncAllWorkPackages } from "@/app/actions/cron";

export async function GET(request: NextRequest) {
    // 1. Verify Authorization
    // Vercel Cron sends an Authorization header: Bearer Bearer <CRON_SECRET>
    // Note: Vercel documentation says "Authorization: Bearer <CRON_SECRET>" but some versions use it differently.
    // We also check for our own env var.
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // 1. Verify Authorization
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return new NextResponse(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
    }

    try {
        console.log("[CRON API] Starting automated sync...");
        const result = await syncAllWorkPackages();

        return NextResponse.json({
            message: "Sincronización masiva finalizada",
            result
        });
    } catch (error: any) {
        console.error("[CRON API] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
