"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
// import { prisma } from "@/lib/prisma"; // Removed: Prisma is server-only

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

    // Initialize state from props only once when mounting or when props change significantly
    useEffect(() => {
        if (initialFilters.targetRoles !== undefined) {
            const roles = initialFilters.targetRoles ? initialFilters.targetRoles.split(',').filter(Boolean) : [];
            setSelectedRoles(roles);
        }
        if (initialFilters.targetClients !== undefined) {
            const clients = initialFilters.targetClients ? initialFilters.targetClients.split(',').filter(Boolean) : [];
            setSelectedClients(clients);
        }
        if (initialFilters.targetWpTypes !== undefined) {
            const types = initialFilters.targetWpTypes ? initialFilters.targetWpTypes.split(',').filter(Boolean) : [];
            setSelectedWpTypes(types);
        }
    }, []); // Only run once on mount to avoid loops with onChange

    // Use a separate effect to notify parent of changes ONLY when local state changes
    useEffect(() => {
        const filters = {
            targetRoles: selectedRoles.join(','),
            targetClients: selectedClients.join(','),
            targetWpTypes: selectedWpTypes.join(',')
        };

        // Deep comparison to prevent notifying if no actual change
        if (filters.targetRoles !== initialFilters.targetRoles ||
            filters.targetClients !== initialFilters.targetClients ||
            filters.targetWpTypes !== initialFilters.targetWpTypes) {
            onChange(filters);
        }
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
