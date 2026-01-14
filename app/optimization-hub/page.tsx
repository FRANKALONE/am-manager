import { getDashboardClients } from "@/app/actions/dashboard";
import { getCurrentUser, getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SharedHeader } from "@/app/components/shared-header";
import { Footer } from "@/app/components/footer";
import OptimizationHubView from "./optimization-hub-view";

export default async function OptimizationHubPage() {
    const user = await getCurrentUser();
    const session = await getAuthSession();

    if (!user || !session) {
        redirect("/login");
    }

    if (!session.permissions.view_optimization_hub && session.userRole !== 'ADMIN') {
        redirect("/dashboard");
    }

    const clients = await getDashboardClients();

    return (
        <div className="flex flex-col min-h-screen">
            <SharedHeader title="Optimization Hub & Consultancy" />
            <main className="flex-grow">
                <OptimizationHubView
                    clients={clients}
                    permissions={session.permissions}
                />
            </main>
            <Footer />
        </div>
    );
}
