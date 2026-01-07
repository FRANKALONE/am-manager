import { NextResponse } from "next/server";
import { changePassword } from "@/app/actions/users";

export async function POST(request: Request) {
    try {
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
