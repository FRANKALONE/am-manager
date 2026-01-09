import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    request: NextRequest,
    { params }: { params: { recipientId: string } }
) {
    try {
        const { recipientId } = params;

        // Update recipient record to mark as opened
        await prisma.massEmailRecipient.update({
            where: { id: recipientId },
            data: { openedAt: new Date() }
        });

        // Return 1x1 transparent GIF
        const transparentGif = Buffer.from(
            'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
            'base64'
        );

        return new NextResponse(transparentGif, {
            headers: {
                'Content-Type': 'image/gif',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
        });
    } catch (error) {
        console.error("Error tracking email open:", error);

        // Still return transparent GIF even on error
        const transparentGif = Buffer.from(
            'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
            'base64'
        );

        return new NextResponse(transparentGif, {
            headers: {
                'Content-Type': 'image/gif'
            }
        });
    }
}
