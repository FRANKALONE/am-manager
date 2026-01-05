import { redirect } from "next/navigation";
import { getMe } from "@/app/actions/users";
import { UserPreferencesForm } from "../components/user-preferences-form";

export default async function UserPreferencesPage() {
    const user = await getMe();

    if (!user) {
        redirect("/login");
    }

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <UserPreferencesForm
                userId={user.id}
                currentLocale={user.locale}
                currentTimezone={user.timezone}
            />
        </div>
    );
}
