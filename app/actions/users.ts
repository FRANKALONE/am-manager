"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

export async function getUsers() {
    try {
        const users = await prisma.user.findMany({
            include: {
                client: true
            },
            orderBy: { createdAt: 'desc' }
        });
        return users;
    } catch (error) {
        console.error("Failed to fetch users:", error);
        return [];
    }
}

export async function getUserById(id: string) {
    try {
        return await prisma.user.findUnique({
            where: { id },
            include: {
                client: true
            }
        });
    } catch (error) {
        return null;
    }
}

export async function getMe() {
    const userId = cookies().get("user_id")?.value;
    if (!userId) return null;

    try {
        return await prisma.user.findUnique({
            where: { id: userId },
            include: {
                client: true
            }
        });
    } catch (error) {
        return null;
    }
}

export async function createUser(prevState: any, formData: FormData) {
    const name = formData.get("name") as string;
    const surname = formData.get("surname") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const role = formData.get("role") as string;
    const clientId = formData.get("clientId") as string;
    const workPackageIds = formData.get("workPackageIds") as string; // JSON string

    if (!name) return { error: "Nombre obligatorio" };
    if (!email) return { error: "Email obligatorio" };
    if (!password) return { error: "Contraseña obligatoria" };
    if (!role) return { error: "Rol obligatorio" };

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.user.create({
            data: {
                name,
                surname: surname || null,
                email,
                password: hashedPassword,
                role,
                clientId: clientId || null,
                workPackageIds: workPackageIds || null
            }
        });
    } catch (error: any) {
        console.error(error);
        if (error.code === 'P2002') {
            return { error: "El email ya está en uso" };
        }
        return { error: "Error al crear usuario" };
    }

    revalidatePath("/admin/users");
    redirect("/admin/users");
}

export async function updateUser(id: string, prevState: any, formData: FormData) {
    const name = formData.get("name") as string;
    const surname = formData.get("surname") as string;
    const email = formData.get("email") as string;
    const role = formData.get("role") as string;
    const clientId = formData.get("clientId") as string;
    const workPackageIds = formData.get("workPackageIds") as string;

    if (!name) return { error: "Nombre obligatorio" };
    if (!email) return { error: "Email obligatorio" };
    if (!role) return { error: "Rol obligatorio" };

    try {
        await prisma.user.update({
            where: { id },
            data: {
                name,
                surname: surname || null,
                email,
                role,
                clientId: clientId || null,
                workPackageIds: workPackageIds || null
            }
        });
    } catch (error: any) {
        console.error(error);
        if (error.code === 'P2002') {
            return { error: "El email ya está en uso" };
        }
        return { error: "Error al actualizar usuario" };
    }

    revalidatePath("/admin/users");
    redirect("/admin/users");
}

export async function deleteUser(id: string) {
    try {
        await prisma.user.delete({ where: { id } });
        revalidatePath("/admin/users");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Error al eliminar usuario" };
    }
}

export async function resetUserPassword(id: string, newPassword: string) {
    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id },
            data: { password: hashedPassword }
        });
        revalidatePath("/admin/users");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Error al resetear contraseña" };
    }
}

export async function authenticate(prevState: any, formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
        return { error: "Email y contraseña requeridos" };
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            return { error: "Credenciales inválidas" };
        }

        // Check password
        let isPasswordCorrect = await bcrypt.compare(password, user.password);

        if (!isPasswordCorrect && password === user.password) {
            // Migration: If it matched as plain text, migrate it to hashed and allow login
            const hashedPassword = await bcrypt.hash(password, 10);
            await prisma.user.update({
                where: { id: user.id },
                data: { password: hashedPassword }
            });
            isPasswordCorrect = true;
        }

        if (!isPasswordCorrect) {
            return { error: "Credenciales inválidas" };
        }

        // Set session cookie (simplistic implementation for now)
        // In a real app we'd use a better session store or JWT
        cookies().set("user_id", user.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 60 * 60 * 24, // 1 day
            path: "/",
        });

        cookies().set("user_role", user.role, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 60 * 60 * 24, // 1 day
            path: "/",
        });

        // Determine redirect target
        if (user.role === "ADMIN") {
            return { redirect: "/admin-home" };
        } else {
            return { redirect: "/client-dashboard" };
        }

    } catch (error) {
        console.error(error);
        return { error: "Error en el servidor" };
    }
}

export async function logout() {
    console.log("[AUTH] Logging out user...");
    const cookieStore = cookies();
    cookieStore.set("user_id", "", { path: "/", expires: new Date(0) });
    cookieStore.set("user_role", "", { path: "/", expires: new Date(0) });
    console.log("[AUTH] Cookies cleared, redirecting to login");
    redirect("/login");
}

