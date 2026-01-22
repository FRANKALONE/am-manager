"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, FileText } from "lucide-react";
import Link from "next/link";
import { deleteSpecialRegularization } from "@/app/actions/special-regularizations";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

type Regularization = {
    id: string;
    name: string;
    type: string;
    config: string;
    _count?: { validityPeriods: number };
};

export function SpecialRegularizationsList({ regularizations }: { regularizations: Regularization[] }) {
    const router = useRouter();

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`¿Eliminar la regularización "${name}"?`)) return;

        const result = await deleteSpecialRegularization(id);
        if (result.success) {
            router.refresh();
        } else {
            alert(result.error);
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case "RAPPEL":
                return "Rappel por Volumen";
            case "CONSULTANT_LEVEL":
                return "Categoría de Consultor";
            default:
                return type;
        }
    };

    const getConfigSummary = (type: string, config: string) => {
        try {
            const parsed = JSON.parse(config);
            if (type === "RAPPEL") {
                return `${parsed.length} tramos definidos`;
            } else if (type === "CONSULTANT_LEVEL") {
                return `${Object.keys(parsed).length} niveles`;
            }
        } catch {
            return "Configuración inválida";
        }
        return "";
    };

    if (regularizations.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay regularizaciones especiales configuradas.</p>
                <p className="text-sm mt-2">Crea una nueva para empezar.</p>
            </div>
        );
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Configuración</TableHead>
                        <TableHead>WPs Asignados</TableHead>
                        <TableHead className="w-[100px]">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {regularizations.map((reg) => (
                        <TableRow key={reg.id}>
                            <TableCell className="font-medium">{reg.name}</TableCell>
                            <TableCell>
                                <Badge variant={reg.type === "RAPPEL" ? "default" : "secondary"}>
                                    {getTypeLabel(reg.type)}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                                {getConfigSummary(reg.type, reg.config)}
                            </TableCell>
                            <TableCell>
                                <span className="text-sm">
                                    {reg._count?.validityPeriods || 0} periodo(s)
                                </span>
                            </TableCell>
                            <TableCell>
                                <div className="flex gap-2">
                                    <Link href={`/admin/special-regularizations/${reg.id}/edit`}>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    </Link>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-red-500"
                                        onClick={() => handleDelete(reg.id, reg.name)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
