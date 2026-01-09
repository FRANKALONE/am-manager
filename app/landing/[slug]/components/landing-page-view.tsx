"use client";

export function LandingPageView({ landing, userName }: { landing: any; userName: string }) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="max-w-4xl mx-auto p-8">
                <div className="bg-white rounded-xl shadow-lg p-8">
                    <h1 className="text-3xl font-bold text-slate-800 mb-6">{landing.title}</h1>
                    <div
                        className="prose prose-slate max-w-none"
                        dangerouslySetInnerHTML={{ __html: landing.content }}
                    />
                    <div className="mt-8 pt-6 border-t border-slate-200">
                        <p className="text-xs text-slate-400">
                            Vista por {userName} • Creada por {landing.creator.name} {landing.creator.surname}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
