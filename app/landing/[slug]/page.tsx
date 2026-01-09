import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getLandingBySlug, trackLandingView } from "@/app/actions/landings";
import { LandingPageView } from "./components/landing-page-view";

export default async function LandingPage({ params }: { params: { slug: string } }) {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        redirect('/login');
    }

    const landing = await getLandingBySlug(params.slug, session.user.id);

    if (!landing) {
        notFound();
    }

    // Track view
    await trackLandingView(landing.id, session.user.id);

    return (
        <LandingPageView
            landing={landing}
            userName={session.user.name}
        />
    );
}
