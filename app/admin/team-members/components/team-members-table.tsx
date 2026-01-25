"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateTeamMemberLevel } from "@/app/actions/team-members";
import { useState, useMemo } from "react";
import { Check, X, Edit2, Search, FilterX, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type TeamMember = {
    id: string;
    name: string;
    level: string | null;
    weeklyCapacity: number;
    team: { name: string } | null;
};

export function TeamMembersTable({ members }: { members: TeamMember[] }) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Filter states
    const [search, setSearch] = useState("");
    const [teamFilter, setTeamFilter] = useState("all");
    const [levelFilter, setLevelFilter] = useState("all");

    const teams = useMemo(() => {
        const uniqueTeams = new Set<string>();
        members.forEach(m => {
            if (m.team?.name) uniqueTeams.add(m.team.name);
        });
        return Array.from(uniqueTeams).sort();
    }, [members]);

    const filteredMembers = useMemo(() => {
        return members.filter(m => {
            const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase());
            const matchesTeam = teamFilter === "all" || m.team?.name === teamFilter;
            const matchesLevel = levelFilter === "all" ||
                (levelFilter === "none" ? !m.level : m.level === levelFilter);

            return matchesSearch && matchesTeam && matchesLevel;
        });
    }, [members, search, teamFilter, levelFilter]);

    const handleEdit = (member: TeamMember) => {
        setEditingId(member.id);
        setEditValue(member.level || "NONE");
    };

    const handleSave = async (id: string) => {
        try {
            console.log("handleSave called for id:", id, "with value:", editValue);
            setIsSaving(true);
            const valueToSave = editValue === "NONE" ? null : editValue;

            console.log("Calling updateTeamMemberLevel server action...");
            const result = await updateTeamMemberLevel(id, valueToSave);
            console.log("Server action result:", result);

            if (result.success) {
                setEditingId(null);
            } else {
                alert(result.error);
            }
        } catch (error) {
            console.error("Error in handleSave:", error);
            alert("Error inesperado al guardar");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditValue("");
    };

    const resetFilters = () => {
        setSearch("");
        setTeamFilter("all");
        setLevelFilter("all");
    };

    return (
        <div className="space-y-4">
            {/* Filters UI */}
            <div className="flex flex-col md:flex-row gap-3 items-end p-1">
                <div className="flex-1 space-y-1">
                    <label className="text-xs font-medium text-muted-foreground ml-1">Buscar Persona</label>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Nombre del empleado..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>

                <div className="w-full md:w-[200px] space-y-1">
                    <label className="text-xs font-medium text-muted-foreground ml-1">Equipo</label>
                    <Select value={teamFilter} onValueChange={setTeamFilter}>
                        <SelectTrigger>
                            <SelectValue placeholder="Todos los equipos" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los equipos</SelectItem>
                            {teams.map(t => (
                                <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="w-full md:w-[200px] space-y-1">
                    <label className="text-xs font-medium text-muted-foreground ml-1">Nivel / Categoría</label>
                    <Select value={levelFilter} onValueChange={setLevelFilter}>
                        <SelectTrigger>
                            <SelectValue placeholder="Cualquier nivel" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Cualquier nivel</SelectItem>
                            <SelectItem value="JUNIOR">JUNIOR</SelectItem>
                            <SelectItem value="SENIOR">SENIOR</SelectItem>
                            <SelectItem value="none">Sin asignación</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <Button
                    variant="ghost"
                    onClick={resetFilters}
                    className="h-10"
                    disabled={search === "" && teamFilter === "all" && levelFilter === "all"}
                >
                    <FilterX className="h-4 w-4 mr-2" />
                    Limpiar
                </Button>
            </div>

            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Equipo</TableHead>
                            <TableHead>Capacidad Semanal</TableHead>
                            <TableHead>Nivel / Categoría</TableHead>
                            <TableHead className="w-[100px]">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredMembers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    No se encontraron miembros con estos filtros.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredMembers.map((member) => (
                                <TableRow key={member.id}>
                                    <TableCell className="font-medium">{member.name}</TableCell>
                                    <TableCell>
                                        {member.team ? (
                                            <Badge variant="outline" className="bg-slate-50">{member.team.name}</Badge>
                                        ) : (
                                            <span className="text-muted-foreground text-sm italic">Sin equipo</span>
                                        )}
                                    </TableCell>
                                    <TableCell>{member.weeklyCapacity}h</TableCell>
                                    <TableCell>
                                        {editingId === member.id ? (
                                            <Select value={editValue} onValueChange={setEditValue} disabled={isSaving}>
                                                <SelectTrigger className="w-[140px] h-8 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="NONE">Sin categoría</SelectItem>
                                                    <SelectItem value="JUNIOR">JUNIOR</SelectItem>
                                                    <SelectItem value="SENIOR">SENIOR</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <span className={member.level ? "font-bold text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100" : "text-muted-foreground text-xs italic"}>
                                                {member.level || "SIN CATEGORÍA"}
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {editingId === member.id ? (
                                            <div className="flex gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                    onClick={() => handleSave(member.id)}
                                                    disabled={isSaving}
                                                >
                                                    {isSaving ? (
                                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Check className="h-4 w-4" />
                                                    )}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                    onClick={handleCancel}
                                                    disabled={isSaving}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-slate-400 hover:text-slate-600"
                                                onClick={() => handleEdit(member)}
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
            {filteredMembers.length > 0 && members.length !== filteredMembers.length && (
                <p className="text-xs text-muted-foreground text-right">
                    Mostrando {filteredMembers.length} de {members.length} miembros.
                </p>
            )}
        </div>
    );
}
