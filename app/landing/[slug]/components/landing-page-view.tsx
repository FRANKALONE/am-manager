"use client";

import { CheckCircle2, ChevronDown, MousePointer2, Plus as PlusIcon, Minus as MinusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function LandingPageView({ landing, userName }: { landing: any; userName: string }) {
    const [openFaq, setOpenFaq] = useState<number | null>(null);
    let blocks: any[] = [];
    let isJson = false;

    try {
        if (landing.content.startsWith('[')) {
            blocks = JSON.parse(landing.content);
            isJson = true;
        }
    } catch (e) {
        isJson = false;
    }

    const renderBlocks = () => {
        return blocks.map((block: any, index: number) => {
            switch (block.type) {
                case 'hero':
                    const heroGradients: any = {
                        blue: "from-blue-600 to-indigo-700",
                        green: "from-green-500 to-emerald-600",
                        dark: "from-slate-800 to-slate-900",
                        slate: "from-slate-500 to-slate-700"
                    };
                    return (
                        <div key={index} className={`py-20 px-8 text-center bg-gradient-to-br ${heroGradients[block.content.bgGradient] || heroGradients.blue} text-white rounded-3xl mb-12 shadow-xl`}>
                            <h1 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight">{block.content.title}</h1>
                            <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto leading-relaxed">{block.content.subtitle}</p>
                        </div>
                    );

                case 'features':
                    return (
                        <div key={index} className="py-12 mb-12">
                            <h2 className="text-2xl font-bold text-slate-800 mb-8 text-center">{block.content.title}</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {block.content.items.map((item: any, i: number) => (
                                    <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                                            <CheckCircle2 className="w-6 h-6 text-blue-500" />
                                        </div>
                                        <h3 className="font-bold text-slate-800 mb-2">{item.title}</h3>
                                        <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );

                case 'banner':
                    return (
                        <div key={index} className="py-12 mb-12 px-8 bg-slate-900 text-white rounded-3xl text-center relative overflow-hidden">
                            <div className="relative z-10">
                                <h2 className="text-3xl font-bold mb-4">{block.content.title}</h2>
                                <p className="text-slate-300 max-w-2xl mx-auto">{block.content.text}</p>
                            </div>
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 opacity-20 blur-3xl -mr-16 -mt-16 rounded-full"></div>
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500 opacity-20 blur-3xl -ml-16 -mb-16 rounded-full"></div>
                        </div>
                    );

                case 'faq':
                    return (
                        <div key={index} className="py-12 mb-12 max-w-2xl mx-auto">
                            <h2 className="text-2xl font-bold text-slate-800 mb-8 text-center">{block.content.title}</h2>
                            <div className="space-y-3">
                                {block.content.items.map((item: any, i: number) => (
                                    <div key={i} className="bg-white border rounded-2xl overflow-hidden transition-all duration-200">
                                        <button
                                            onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                            className="w-full flex items-center justify-between p-5 text-left font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                                        >
                                            <span>{item.q}</span>
                                            {openFaq === i ? <MinusIcon className="w-4 h-4 text-blue-500" /> : <PlusIcon className="w-4 h-4 text-slate-400" />}
                                        </button>
                                        <div className={`overflow-hidden transition-all duration-300 ${openFaq === i ? 'max-h-96' : 'max-h-0'}`}>
                                            <div className="p-5 pt-0 text-slate-500 leading-relaxed">
                                                {item.a}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );

                case 'cta':
                    return (
                        <div key={index} className="py-16 mb-12 text-center bg-blue-50/50 rounded-3xl border border-blue-100">
                            <h2 className="text-2xl font-bold text-slate-800 mb-4">{block.content.text}</h2>
                            <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 rounded-full px-10 h-14 text-lg">
                                <a href={block.content.link}>
                                    <MousePointer2 className="w-5 h-5 mr-2" />
                                    {block.content.buttonText}
                                </a>
                            </Button>
                        </div>
                    );

                default:
                    return null;
            }
        });
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-100">
            {/* Header / Top Bar */}
            <div className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100 py-3">
                <div className="max-w-5xl mx-auto px-6 flex justify-between items-center">
                    <span className="font-extrabold text-xl tracking-tight text-slate-800">Manager AM <span className="text-blue-600">Altim</span></span>
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">{landing.slug}</span>
                </div>
            </div>

            <main className="max-w-5xl mx-auto py-12 px-6">
                {isJson ? (
                    renderBlocks()
                ) : (
                    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-12 border border-slate-100">
                        <h1 className="text-4xl font-extrabold text-slate-800 mb-8 tracking-tight border-b pb-6">
                            {landing.title}
                        </h1>
                        <div
                            className="prose prose-slate prose-lg max-w-none prose-headings:text-slate-800 prose-p:text-slate-600 prose-strong:text-slate-800 prose-a:text-blue-600"
                            dangerouslySetInnerHTML={{ __html: landing.content }}
                        />
                    </div>
                )}

                {/* Footer Metadata */}
                <footer className="mt-16 pt-8 border-t border-slate-200 text-center">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                        Comunicación Exclusiva para {userName}
                    </p>
                    <p className="text-[10px] text-slate-400">
                        Creada por {landing.creator.name} {landing.creator.surname} • Publicada por Manager AM de Altim
                    </p>
                </footer>
            </main>
        </div>
    );
}

