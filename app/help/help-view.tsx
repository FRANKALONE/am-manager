"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MANUAL_CONTENT, HelpSection } from "./content";
import * as Icons from "lucide-react";
import { Printer, Download } from "lucide-react";

interface HelpViewProps {
    permissions: Record<string, boolean>;
    userName: string;
}

export function HelpView({ permissions, userName }: HelpViewProps) {
    // Filter sections based on permissions
    const visibleSections = MANUAL_CONTENT.filter(section =>
        !section.permission || permissions[section.permission]
    );

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 print:py-0 print:px-0">
            <div className="flex justify-between items-center mb-8 print:hidden">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Manual de Usuario</h1>
                    <p className="text-muted-foreground">Documentación personalizada para {userName}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handlePrint}>
                        <Printer className="w-4 h-4 mr-2" />
                        Imprimir / PDF
                    </Button>
                </div>
            </div>

            {/* Print Header */}
            <div className="hidden print:block mb-8 border-b pb-4">
                <h1 className="text-4xl font-bold text-slate-900 mb-2">Manual de Usuario - AM Manager</h1>
                <p className="text-slate-600">Documento generado para: {userName}</p>
                <p className="text-slate-600">Fecha: {new Date().toLocaleDateString('es-ES')}</p>
            </div>

            <div className="space-y-8">
                {visibleSections.map((section) => {
                    const IconComponent = (Icons as any)[section.icon] || Icons.HelpCircle;

                    return (
                        <Card key={section.id} className="shadow-sm print:shadow-none print:border-none">
                            <CardHeader className="flex flex-row items-center gap-4 bg-slate-50/50 print:bg-transparent border-b">
                                <div className="p-2 bg-malachite/10 rounded-lg text-jade print:hidden">
                                    <IconComponent className="w-6 h-6" />
                                </div>
                                <CardTitle className="text-xl print:text-2xl text-dark-green">{section.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-4">
                                {section.content.map((block, idx) => (
                                    <div key={idx} className="space-y-2">
                                        {block.subtitle && (
                                            <h3 className="text-lg font-semibold text-slate-800">{block.subtitle}</h3>
                                        )}
                                        <p className="text-slate-600 leading-relaxed">{block.text}</p>
                                        {block.items && (
                                            <ul className="list-disc list-inside space-y-1 ml-4 text-slate-600">
                                                {block.items.map((item, i) => (
                                                    <li key={i}>{item}</li>
                                                ))}
                                            </ul>
                                        )}
                                        {block.note && (
                                            <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 text-sm text-yellow-800 italic">
                                                <strong>Nota:</strong> {block.note}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <footer className="mt-12 text-center text-sm text-muted-foreground print:hidden">
                <p>© {new Date().getFullYear()} - AM Manager v2512.001</p>
                <p>Si necesita ayuda adicional, contacte con soporte técnico.</p>
            </footer>

            {/* Print Footer */}
            <div className="hidden print:block fixed bottom-0 left-0 right-0 text-center text-xs text-slate-400 border-t pt-2 bg-white">
                © {new Date().getFullYear()} - AM Manager - Documentación Confidencial
            </div>
        </div>
    );
}
