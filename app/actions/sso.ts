"use server";

import { SignJWT } from "jose";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function redirectToAcademy() {
    const user = await getCurrentUser();

    if (!user) {
        throw new Error("No hay sesión activa");
    }

    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
        throw new Error("NEXTAUTH_SECRET no está configurado");
    }

    // El secreto debe ser convertido a Uint8Array para jose
    const secretKey = new TextEncoder().encode(secret);

    // Generar el token JWT
    const token = await new SignJWT({
        email: user.email,
        clientName: user.client?.name || "Trial User",
    })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("5m") // Expira en 5 minutos
        .sign(secretKey);

    // URL de destino
    const academyUrl = `https://altim-video-academy-cmrj.vercel.app/sso?token=${token}`;

    // Redirección segura
    redirect(academyUrl);
}
