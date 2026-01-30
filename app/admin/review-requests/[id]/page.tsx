import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ReviewPageClient } from "./review-page-client";

export default async function Page({ params }: { params: { id: string } }) {
    const user = await getCurrentUser();
    if (!user) redirect("/login");

    return (
        <div className="bg-slate-50 min-h-screen">
            <ReviewPageClient
                requestId={params.id}
                adminId={user.id}
                userRole={user.role}
            />
        </div>
    );
}
