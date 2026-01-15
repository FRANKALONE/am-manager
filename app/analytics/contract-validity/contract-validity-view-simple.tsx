"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";

export function ContractValidityView({ initialData }: { initialData: any[] }) {
    if (!initialData || initialData.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Validez de Contratos</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-slate-500">No hay datos disponibles para mostrar.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Validez de Contratos
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {initialData.map((client: any) => (
                        <div key={client.id} className="border-b pb-4">
                            <h3 className="font-bold text-lg mb-2">{client.name}</h3>
                            {client.workPackages?.map((wp: any) => (
                                <div key={wp.id} className="ml-4 mb-2">
                                    <p className="text-sm font-medium">{wp.name}</p>
                                    <p className="text-xs text-slate-500">
                                        {wp.contractType} - {wp.renewalType}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
