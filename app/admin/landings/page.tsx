import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LandingsView } from "./components/landings-view";

export default async function LandingsPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
        redirect('/');
    }

    return <LandingsView userId={session.user.id} />;
}
