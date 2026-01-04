import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { UserPreferencesForm } from "../components/user-preferences-form";

export default async function UserPreferencesPage() {
    const userEmail = cookies().get("user_email")?.value;

    if (!userEmail) {
        redirect("/login");
    }

    const user = await prisma.user.findUnique({
        where: { email: userEmail },
        select: {
            id: true,
            locale: true,
            timezone: true,
        },
    });

    if (!user) {
        redirect("/login");
    }

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <UserPreferencesForm
                userId={user.id}
                currentLocale={user.locale || "es"}
                currentTimezone={user.timezone || "Europe/Madrid"}
            />
        </div>
    );
}
