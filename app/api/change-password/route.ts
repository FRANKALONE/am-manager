import { NextResponse } from "next/server";
import { changePassword } from "@/app/actions/users";
import { getAuthSession } from "@/lib/auth";

export async function POST(request: Request) {
    try {
        const session = await getAuthSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { currentPassword, newPassword } = await request.json();

        const result = await changePassword(currentPassword, newPassword);

        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json(
            { success: false, error: "Error al procesar la solicitud" },
            { status: 500 }
        );
    }
}
