import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MassEmailsView } from "./components/mass-emails-view";

export default async function MassEmailsPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
        redirect('/');
    }

    return <MassEmailsView userId={session.user.id} />;
}
