"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { prisma } from "@/lib/prisma";

interface RecipientsFilterProps {
    initialFilters: {
        targetRoles: string;
        targetClients: string;
        targetWpTypes: string;
    };
    onChange: (filters: { targetRoles: string; targetClients: string; targetWpTypes: string }) => void;
}

export function RecipientsFilter({ initialFilters, onChange }: RecipientsFilterProps) {
    const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
    const [selectedClients, setSelectedClients] = useState<string[]>([]);
    const [selectedWpTypes, setSelectedWpTypes] = useState<string[]>([]);

    const availableRoles = ["ADMIN", "GERENTE", "DIRECTOR", "COLABORADOR", "USER"];
    const availableWpTypes = ["BOLSA", "BD", "EVENTOS", "MANTENIMIENTO"];

    useEffect(() => {
        if (initialFilters.targetRoles) {
            setSelectedRoles(initialFilters.targetRoles.split(','));
        }
        if (initialFilters.targetClients) {
            setSelectedClients(initialFilters.targetClients.split(','));
        }
        if (initialFilters.targetWpTypes) {
            setSelectedWpTypes(initialFilters.targetWpTypes.split(','));
        }
    }, [initialFilters]);

    useEffect(() => {
        onChange({
            targetRoles: selectedRoles.join(','),
            targetClients: selectedClients.join(','),
            targetWpTypes: selectedWpTypes.join(',')
        });
    }, [selectedRoles, selectedClients, selectedWpTypes]);

    const toggleRole = (role: string) => {
        setSelectedRoles(prev =>
            prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
        );
    };

    const toggleWpType = (type: string) => {
        setSelectedWpTypes(prev =>
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        );
    };

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label className="text-sm font-bold">Filtrar por Roles</Label>
                <div className="flex flex-wrap gap-2">
                    {availableRoles.map(role => (
                        <Badge
                            key={role}
                            variant={selectedRoles.includes(role) ? "default" : "outline"}
                            className="cursor-pointer hover:opacity-80"
                            onClick={() => toggleRole(role)}
                        >
                            {role}
                            {selectedRoles.includes(role) && <X className="w-3 h-3 ml-1" />}
                        </Badge>
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                <Label className="text-sm font-bold">Filtrar por Tipo de WP</Label>
                <div className="flex flex-wrap gap-2">
                    {availableWpTypes.map(type => (
                        <Badge
                            key={type}
                            variant={selectedWpTypes.includes(type) ? "default" : "outline"}
                            className="cursor-pointer hover:opacity-80"
                            onClick={() => toggleWpType(type)}
                        >
                            {type}
                            {selectedWpTypes.includes(type) && <X className="w-3 h-3 ml-1" />}
                        </Badge>
                    ))}
                </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                    <strong>Nota:</strong> Los filtros se combinan con lógica AND.
                    Si seleccionas roles y tipos de WP, solo se incluirán usuarios que cumplan ambas condiciones.
                </p>
            </div>
        </div>
    );
}
