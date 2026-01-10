import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MassEmailsView } from "./components/mass-emails-view";

export default async function MassEmailsPage() {
    const session = await getAuthSession();

    if (!session) {
        redirect('/login');
    }

    if (!session.permissions.manage_mass_emails) {
        redirect('/');
    }

    return <MassEmailsView userId={session.userId} />;
}
