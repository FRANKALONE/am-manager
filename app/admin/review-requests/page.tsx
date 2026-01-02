import { getPendingReviewRequests, getReviewRequestsHistory } from "@/app/actions/review-requests";
import { ReviewRequestClient } from "./components/review-request-client";
import { getMe } from "@/app/actions/users";
import { redirect } from "next/navigation";

export default async function ReviewRequestsPage() {
    const user = await getMe();
    if (!user) redirect("/login");

    const isGerente = user.role === "GERENTE";
    let pendingRequests = await getPendingReviewRequests();
    let historyRequests = await getReviewRequestsHistory();

    if (isGerente) {
        pendingRequests = pendingRequests.filter(r => r.workPackage?.client?.manager === user.id);
        historyRequests = historyRequests.filter(r => r.workPackage?.client?.manager === user.id);
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2 p-8 pb-0">
                <h2 className="text-3xl font-bold tracking-tight">Gestión de Reclamaciones</h2>
                <p className="text-muted-foreground">
                    Revisa y gestiona las solicitudes de revisión de horas enviadas por los clientes.
                </p>
            </div>

            <ReviewRequestClient
                initialPendingRequests={pendingRequests}
                initialHistoryRequests={historyRequests}
                userId={user.id}
                userRole={user.role}
            />
        </div>
    );
}
