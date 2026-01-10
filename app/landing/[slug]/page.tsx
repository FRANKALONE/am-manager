import { getAuthSession, getCurrentUser } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getLandingBySlug, trackLandingView } from "@/app/actions/landings";
import { LandingPageView } from "./components/landing-page-view";

export default async function LandingPage({ params }: { params: { slug: string } }) {
    const session = await getAuthSession();
    const user = await getCurrentUser();

    if (!session || !user) {
        redirect('/login');
    }

    const landing = await getLandingBySlug(params.slug, session.userId);

    if (!landing) {
        notFound();
    }

    // Track view
    await trackLandingView(landing.id, session.userId);

    return (
        <LandingPageView
            landing={landing}
            userName={user.name || ''}
        />
    );
}
