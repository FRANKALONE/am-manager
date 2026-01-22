"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateTeamMemberLevel } from "@/app/actions/team-members";
import { useState } from "react";
import { Check, X, Edit2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

    const handleEdit = (member: TeamMember) => {
        setEditingId(member.id);
        setEditValue(member.level || "");
    };

    const handleSave = async (id: string) => {
        const result = await updateTeamMemberLevel(id, editValue || null);
        if (result.success) {
            setEditingId(null);
        } else {
            alert(result.error);
        }
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditValue("");
    };

    return (
        <div className="rounded-md border">
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
                    {members.map((member) => (
                        <TableRow key={member.id}>
                            <TableCell className="font-medium">{member.name}</TableCell>
                            <TableCell>
                                {member.team ? (
                                    <Badge variant="outline">{member.team.name}</Badge>
                                ) : (
                                    <span className="text-muted-foreground text-sm">Sin equipo</span>
                                )}
                            </TableCell>
                            <TableCell>{member.weeklyCapacity}h</TableCell>
                            <TableCell>
                                {editingId === member.id ? (
                                    <Input
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        placeholder="Junior, Senior, etc."
                                        className="max-w-[200px]"
                                        autoFocus
                                    />
                                ) : (
                                    <span className={member.level ? "font-medium" : "text-muted-foreground italic"}>
                                        {member.level || "Sin categoría"}
                                    </span>
                                )}
                            </TableCell>
                            <TableCell>
                                {editingId === member.id ? (
                                    <div className="flex gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-green-600"
                                            onClick={() => handleSave(member.id)}
                                        >
                                            <Check className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-500"
                                            onClick={handleCancel}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => handleEdit(member)}
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
