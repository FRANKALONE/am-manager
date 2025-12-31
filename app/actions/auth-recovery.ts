"use server";

import { prisma } from "@/lib/prisma";
import { getPasswordResetTemplate, sendEmail } from "@/lib/mail";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function requestPasswordReset(prevState: any, formData: FormData) {
    const email = formData.get("email") as string;

    if (!email) {
        return { error: "El email es obligatorio" };
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email }
        });

        // For security, don't reveal if user exists or not
        if (!user) {
            return { success: true, message: "Si el email existe en nuestra base de datos, recibirás un enlace de recuperación próximamente." };
        }

        // Generate token
        const token = crypto.randomBytes(32).toString("hex");
        const expiry = new Date(Date.now() + 3600000); // 1 hour

        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetToken: token,
                resetTokenExpiry: expiry
            }
        });

        // Send email (mock)
        const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login/reset-password?token=${token}`;
        await sendEmail({
            to: email,
            subject: "Recuperación de contraseña - AM Manager",
            html: getPasswordResetTemplate(resetLink)
        });

        return { success: true, message: "Si el email existe en nuestra base de datos, recibirás un enlace de recuperación próximamente." };

    } catch (error) {
        console.error("Error requesting password reset:", error);
        return { error: "Error al procesar la solicitud" };
    }
}

export async function resetPassword(prevState: any, formData: FormData) {
    const token = formData.get("token") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (!token) return { error: "Token inválido o expirado" };
    if (!password) return { error: "La contraseña es obligatoria" };
    if (password !== confirmPassword) return { error: "Las contraseñas no coinciden" };
    if (password.length < 6) return { error: "La contraseña debe tener al menos 6 caracteres" };

    try {
        const user = await prisma.user.findFirst({
            where: {
                resetToken: token,
                resetTokenExpiry: { gte: new Date() }
            }
        });

        if (!user) {
            return { error: "El enlace de recuperación es inválido o ha caducado" };
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetToken: null,
                resetTokenExpiry: null
            }
        });

        return { success: true, message: "Contraseña actualizada correctamente" };

    } catch (error) {
        console.error("Error resetting password:", error);
        return { error: "Error al restablecer la contraseña" };
    }
}
