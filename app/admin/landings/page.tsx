import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LandingsView } from "./components/landings-view";

export default async function LandingsPage() {
    const session = await getAuthSession();

    if (!session) {
        redirect('/login');
    }

    if (!session.permissions.manage_landings) {
        redirect('/');
    }

    return <LandingsView userId={session.userId} />;
}
