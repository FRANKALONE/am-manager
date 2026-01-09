import { getPendingReviewRequests, getReviewRequestsHistory } from "@/app/actions/review-requests";
import { ReviewRequestClient } from "./components/review-request-client";
import { getCurrentUser, getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ReviewRequestsPage() {
    const user = await getCurrentUser();
    const session = await getAuthSession();

    if (!user || !session) redirect("/login");

    const pendingRequests = await getPendingReviewRequests();
    const historyRequests = await getReviewRequestsHistory();

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
