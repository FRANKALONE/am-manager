"use client";

import React, { useState, useTransition } from "react";
import {
    Users,
    Calendar,
    TrendingUp,
    Plus,
    Trash2,
    UserPlus,
    AlertCircle,
    CheckCircle2,
    BarChart3,
    Clock,
    Briefcase,
    Zap,
    RefreshCw,
    Filter,
    Check,
    ChevronDown
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    createTeamMember,
    createAssignment,
    deleteAssignment,
    updateTeamMember,
    syncTeamsFromTempo
} from "@/app/actions/capacity";
import { Progress } from "@/components/ui/progress";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/utils";

interface CapacityDashboardProps {
    initialWorkload: {
        weeks: { start: Date | string, end: Date | string }[];
        members: any[];
    };
    forecast: {
        avgTicketsPerWeek: number;
        avgHoursPerTicket: number;
        predictedWeeklyHours: number;
    };
    members: any[];
    teams: any[];
}

export function CapacityDashboard({ initialWorkload, forecast, members: allMembers, teams }: CapacityDashboardProps) {
    const [isPending, startTransition] = useTransition();
    const [workload, setWorkload] = useState(initialWorkload);

    // Initialize with teams starting with "AMA"
    const amaTeamIds = teams.filter(t => t.name.startsWith("AMA")).map(t => t.id);
    const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(amaTeamIds.length > 0 ? amaTeamIds : []);

    // UI State
    const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false);
    const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
    const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
    const [selectedMemberId, setSelectedMemberId] = useState("");
    const [selectedWeekDetail, setSelectedWeekDetail] = useState<any>(null);

    // Form states
    const [newMember, setNewMember] = useState({ name: "", capacity: 40, teamId: "" });
    const [assignmentMode, setAssignmentMode] = useState<'hours' | 'percent'>('hours');
    const [loadPercent, setLoadPercent] = useState(50);
    const [newAssignment, setNewAssignment] = useState({
        description: "",
        hours: 0,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0]
    });

    const handleAddMember = async () => {
        if (!newMember.name) return;
        startTransition(async () => {
            try {
                await createTeamMember({
                    name: newMember.name,
                    weeklyCapacity: Number(newMember.capacity),
                    teamId: newMember.teamId || undefined
                });
                toast.success("Miembro añadido correctamente");
                setIsMemberDialogOpen(false);
                setNewMember({ name: "", capacity: 40, teamId: "" });
                window.location.reload();
            } catch (e) {
                toast.error("Error al añadir miembro");
            }
        });
    };

    const handleSyncTeams = async () => {
        startTransition(async () => {
            const result = await syncTeamsFromTempo();
            if (result.success) {
                toast.success(`Sincronizados ${result.count} equipos desde Tempo`);
                window.location.reload();
            } else {
                toast.error("Error al sincronizar equipos: " + result.error);
            }
        });
    };

    const handleAddAssignment = async () => {
        if (!selectedMemberId || !newAssignment.description) return;

        let finalHours = Number(newAssignment.hours);
        let finalDescription = newAssignment.description;

        if (assignmentMode === 'percent') {
            const member = allMembers.find(m => m.id === selectedMemberId);
            const capacity = member?.weeklyCapacity || 40;
            const start = new Date(newAssignment.startDate);
            const end = new Date(newAssignment.endDate);
            end.setHours(23, 59, 59, 999);

            const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));
            finalHours = (days / 7) * capacity * (loadPercent / 100);
            finalDescription = `[${loadPercent}%] ${newAssignment.description}`;
        }

        startTransition(async () => {
            try {
                await createAssignment({
                    memberId: selectedMemberId,
                    description: finalDescription,
                    hours: finalHours,
                    startDate: new Date(newAssignment.startDate),
                    endDate: new Date(newAssignment.endDate)
                });
                toast.success("Asignación creada");
                setIsAssignmentDialogOpen(false);
                window.location.reload();
            } catch (e) {
                toast.error("Error al crear asignación");
            }
        });
    };

    // Filtered workload
    const filteredMembers = selectedTeamIds.length === 0
        ? workload.members
        : workload.members.filter(m => {
            const memberInfo = allMembers.find(am => am.id === m.id);
            return memberInfo?.teamId && selectedTeamIds.includes(memberInfo.teamId);
        });

    const totalCapacity = filteredMembers.reduce((sum, m) => sum + m.capacity, 0);
    const currentWeekLoad = filteredMembers.reduce((sum, m) => sum + m.weeks[0].totalLoad, 0);
    const avgUtilization = totalCapacity > 0 ? (currentWeekLoad / totalCapacity) * 100 : 0;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header / Stats */}
            <div className="grid gap-6 md:grid-cols-4">
                <Card className="bg-white border-slate-200/60 shadow-sm overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                        <Users className="w-12 h-12" />
                    </div>
                    <CardContent className="pt-6">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                            {selectedTeamIds.length > 0 && selectedTeamIds.every(id => teams.find(t => t.id === id)?.name.startsWith("AMA"))
                                ? "EQUIPO AMA"
                                : "MIEMBROS SELECCIONADOS"}
                        </p>
                        <h3 className="text-2xl font-black text-slate-900">{filteredMembers.length} <span className="text-sm font-medium text-slate-400">miembros</span></h3>
                    </CardContent>
                </Card>

                <Card className="bg-white border-slate-200/60 shadow-sm overflow-hidden relative group">
                    <CardContent className="pt-6">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Capacidad Seleccionada</p>
                        <h3 className="text-2xl font-black text-slate-900">{totalCapacity} <span className="text-sm font-medium text-slate-400">h / semana</span></h3>
                    </CardContent>
                </Card>

                <Card className={`overflow-hidden relative group border-none shadow-md ${avgUtilization > 90 ? 'bg-rose-600 text-white' : 'bg-dark-green text-white'}`}>
                    <CardContent className="pt-6">
                        <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-1">Ocupación Actual</p>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-black">{avgUtilization.toFixed(0)}%</h3>
                            {avgUtilization > 90 && <AlertCircle className="w-4 h-4 text-white animate-pulse" />}
                        </div>
                        <Progress value={avgUtilization} className="h-1.5 mt-4 bg-white/20" />
                    </CardContent>
                </Card>

                <Card className="bg-indigo-600 text-white border-none shadow-md overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-3 opacity-20">
                        <TrendingUp className="w-10 h-10" />
                    </div>
                    <CardContent className="pt-6">
                        <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-1">Previsión unassigned</p>
                        <h3 className="text-2xl font-black">+{forecast.predictedWeeklyHours.toFixed(0)}h <span className="text-xs font-medium text-white/60">avg/week</span></h3>
                        <p className="text-[9px] mt-2 text-white/50">Basado en tickets de los últimos 3 meses</p>
                    </CardContent>
                </Card>
            </div>

            {/* Actions & Filters Bar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                        <Filter className="w-5 h-5 text-dark-green" />
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full">
                        <label className="text-xs font-black uppercase text-slate-400 tracking-widest whitespace-nowrap">Equipos Filtrados:</label>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="h-10 px-4 rounded-xl border-slate-200 font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 min-w-[240px] justify-between">
                                    <span className="truncate">
                                        {selectedTeamIds.length === 0
                                            ? "Todos los equipos"
                                            : selectedTeamIds.length === 1
                                                ? teams.find(t => t.id === selectedTeamIds[0])?.name
                                                : `${selectedTeamIds.length} equipos seleccionados`}
                                    </span>
                                    <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-72 bg-white" align="start" side="bottom" sideOffset={8}>
                                <DropdownMenuLabel className="font-black text-[10px] uppercase tracking-widest text-slate-400">Seleccionar Equipos</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuCheckboxItem
                                    checked={selectedTeamIds.length === 0}
                                    onCheckedChange={() => setSelectedTeamIds([])}
                                    className="font-bold text-slate-600"
                                >
                                    Todos los equipos
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuSeparator />
                                {teams.map((team) => (
                                    <DropdownMenuCheckboxItem
                                        key={team.id}
                                        checked={selectedTeamIds.includes(team.id)}
                                        onCheckedChange={(checked) => {
                                            setSelectedTeamIds(prev =>
                                                checked
                                                    ? [...prev, team.id]
                                                    : prev.filter(id => id !== team.id)
                                            );
                                        }}
                                        className={cn(
                                            "font-medium",
                                            team.name.startsWith("AMA") && "text-dark-green font-bold"
                                        )}
                                    >
                                        <div className="flex items-center justify-between w-full">
                                            <span>{team.name}</span>
                                            <Badge variant="outline" className="ml-2 text-[8px] font-black h-4 px-1">{team._count.members}</Badge>
                                        </div>
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <Button
                        onClick={handleSyncTeams}
                        variant="outline"
                        disabled={isPending}
                        className="h-10 rounded-xl border-indigo-200 text-indigo-700 hover:bg-indigo-50 gap-2 font-bold"
                    >
                        <RefreshCw className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} />
                        Sincronizar Equipos
                    </Button>

                    <Dialog open={isMemberDialogOpen} onOpenChange={setIsMemberDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="h-10 rounded-xl border-slate-200 hover:bg-slate-50 gap-2 font-bold">
                                <UserPlus className="w-4 h-4" />
                                Añadir Miembro
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-white">
                            <DialogHeader>
                                <DialogTitle>Nuevo Miembro del Equipo</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-slate-500">Nombre Completo (JIRA)</label>
                                    <Input
                                        placeholder="Ej: Victoria Aranda Eugui"
                                        value={newMember.name}
                                        onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase text-slate-500">Capacidad Semanal (Horas)</label>
                                        <Input
                                            type="number"
                                            value={newMember.capacity}
                                            onChange={(e) => setNewMember({ ...newMember, capacity: Number(e.target.value) })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase text-slate-500">Equipo</label>
                                        <select
                                            className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm"
                                            value={newMember.teamId}
                                            onChange={(e) => setNewMember({ ...newMember, teamId: e.target.value })}
                                        >
                                            <option value="">Sin equipo</option>
                                            {teams.map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleAddMember} className="bg-dark-green hover:bg-emerald-800 text-white rounded-xl" disabled={isPending}>
                                    {isPending ? 'Guardando...' : 'Guardar Miembro'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={isAssignmentDialogOpen} onOpenChange={setIsAssignmentDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="h-10 rounded-xl bg-dark-green hover:bg-emerald-800 text-white gap-2 font-bold">
                                <Plus className="w-4 h-4" />
                                Nueva Asignación
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-white max-w-md">
                            <DialogHeader>
                                <DialogTitle>Crear Asignación Manual</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-slate-500">Seleccionar Miembro</label>
                                    <select
                                        className="w-full h-10 px-3 rounded-lg border border-slate-200"
                                        value={selectedMemberId}
                                        onChange={(e) => setSelectedMemberId(e.target.value)}
                                    >
                                        <option value="">Selecciona...</option>
                                        {allMembers.map(m => (
                                            <option key={m.id} value={m.id}>{m.name} {m.team ? `(${m.team.name})` : ''}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-slate-500">Descripción / Motivo</label>
                                    <Input
                                        placeholder="Formación, Reunión interna, Vacaciones..."
                                        value={newAssignment.description}
                                        onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Tipo de Carga</label>
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant={assignmentMode === 'hours' ? 'default' : 'outline'}
                                            onClick={() => setAssignmentMode('hours')}
                                            className={cn("flex-1 h-8 text-[10px] rounded-lg font-black", assignmentMode === 'hours' ? "bg-dark-green" : "bg-white")}
                                        >
                                            HORAS TOTALES
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={assignmentMode === 'percent' ? 'default' : 'outline'}
                                            onClick={() => setAssignmentMode('percent')}
                                            className={cn("flex-1 h-8 text-[10px] rounded-lg font-black", assignmentMode === 'percent' ? "bg-dark-green" : "bg-white")}
                                        >
                                            % CAPACIDAD
                                        </Button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase text-slate-500">
                                            {assignmentMode === 'hours' ? 'Horas Totales' : '% Carga Semanal'}
                                        </label>
                                        {assignmentMode === 'hours' ? (
                                            <Input
                                                type="number"
                                                value={newAssignment.hours}
                                                onChange={(e) => setNewAssignment({ ...newAssignment, hours: Number(e.target.value) })}
                                            />
                                        ) : (
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    value={loadPercent}
                                                    onChange={(e) => setLoadPercent(Number(e.target.value))}
                                                    className="pr-8"
                                                />
                                                <span className="absolute right-3 top-2.5 text-slate-400 font-bold">%</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase text-slate-500">Desde</label>
                                        <Input
                                            type="date"
                                            value={newAssignment.startDate}
                                            onChange={(e) => setNewAssignment({ ...newAssignment, startDate: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-slate-500">Hasta</label>
                                    <Input
                                        type="date"
                                        value={newAssignment.endDate}
                                        onChange={(e) => setNewAssignment({ ...newAssignment, endDate: e.target.value })}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleAddAssignment} className="bg-dark-green hover:bg-emerald-800 text-white rounded-xl" disabled={isPending || !selectedMemberId}>
                                    {isPending ? 'Creando...' : 'Crear Asignación'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Team Load Heatmap / Progress */}
            <Card className="border-slate-100 shadow-xl rounded-3xl overflow-hidden bg-white">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-xl font-black text-slate-800 tracking-tight">
                            Cargabilidad {selectedTeamIds.length === 0 ? 'Total' : 'Equipos Seleccionados'}
                        </CardTitle>
                        <CardDescription className="text-xs font-medium">Esfuerzo total considerando tickets de Jira y tareas manuales asignadas.</CardDescription>
                    </div>
                    <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Óptimo</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-amber-500 shadow-sm" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Saturado</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-rose-500 shadow-sm" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sobrecarga</span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest bg-slate-50/30 sticky left-0 z-10 w-[240px]">Miembro</th>
                                    {workload.weeks.map((w, idx) => (
                                        <th key={idx} className="px-4 py-4 text-center text-[10px] font-black uppercase text-slate-400 tracking-widest min-w-[120px]">
                                            Sem. {new Date(w.start).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredMembers.length > 0 ? (
                                    filteredMembers.map((member) => (
                                        <tr key={member.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-5 sticky left-0 bg-white group-hover:bg-slate-50 z-10 border-r border-slate-100 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 border border-slate-200 group-hover:bg-white transition-colors shadow-sm">
                                                        {member.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800 text-sm leading-none whitespace-nowrap">{member.name}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">Cap: {member.capacity}h</span>
                                                            {allMembers.find(am => am.id === member.id)?.team && (
                                                                <Badge variant="outline" className="text-[8px] py-0 h-4 border-slate-100 bg-slate-50 text-slate-500 font-black tracking-tight leading-none uppercase">
                                                                    {allMembers.find(am => am.id === member.id)?.team?.name}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            {member.weeks.map((week: any, idx: number) => {
                                                const color = week.utilization > 100 ? 'bg-rose-500' : (week.utilization > 80 ? 'bg-amber-500' : 'bg-emerald-500');
                                                return (
                                                    <td key={idx} className="px-6 py-5">
                                                        <div
                                                            className="space-y-1.5 flex flex-col items-center cursor-pointer hover:scale-105 transition-transform"
                                                            onClick={() => {
                                                                setSelectedWeekDetail({
                                                                    memberName: member.name,
                                                                    weekStart: week.weekStart,
                                                                    ...week.details
                                                                });
                                                                setIsDetailDialogOpen(true);
                                                            }}
                                                        >
                                                            <div className="flex justify-between w-full max-w-[120px] text-[10px] font-black mb-1">
                                                                <span className={week.utilization > 100 ? 'text-rose-600' : 'text-slate-500'}>{week.totalLoad.toFixed(1)}h</span>
                                                                <span className={week.utilization > 100 ? 'text-rose-600' : 'text-slate-900'}>{week.utilization.toFixed(0)}%</span>
                                                            </div>
                                                            <div className="h-2 w-full max-w-[120px] bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                                                <div
                                                                    className={`h-full ${color} transition-all duration-1000 shadow-[0_0_10px_rgba(0,0,0,0.1)]`}
                                                                    style={{ width: `${Math.min(100, week.utilization)}%` }}
                                                                />
                                                            </div>
                                                            <div className="flex gap-1.5 mt-1 opacity-40 group-hover:opacity-100 transition-opacity">
                                                                <div className="w-1 h-1 rounded-full bg-slate-400" title={`Tickets: ${week.ticketHours.toFixed(1)}h`} />
                                                                <div className="w-1 h-1 rounded-full bg-indigo-400" title={`Asignaciones: ${week.assignmentHours.toFixed(1)}h`} />
                                                            </div>
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <Users className="w-12 h-12 text-slate-100" />
                                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">No hay miembros en este equipo</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Assignments View and Forecast Details */}
            <div className="grid gap-6 lg:grid-cols-2">
                <Card className="border-slate-100 shadow-xl rounded-3xl overflow-hidden bg-white">
                    <CardHeader className="bg-slate-50/30">
                        <div className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-indigo-500" />
                            <CardTitle className="text-lg font-black text-slate-800">Asignaciones Actuales</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {allMembers.flatMap(m => m.assignments.map((as: any) => ({ ...as, memberName: m.name, teamName: m.team?.name }))).length > 0 ? (
                                allMembers.flatMap(m => m.assignments.map((as: any) => ({ ...as, memberName: m.name, teamName: m.team?.name })))
                                    .filter(asig => selectedTeamIds.length === 0 || (allMembers.find(m => m.id === asig.memberId)?.teamId && selectedTeamIds.includes(allMembers.find(m => m.id === asig.memberId)!.teamId!)))
                                    .map((asig: any) => (
                                        <div key={asig.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between group hover:border-indigo-200 transition-all shadow-sm">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center font-black text-indigo-600 shadow-sm group-hover:scale-105 transition-transform">
                                                    {asig.hours}h
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-800 leading-tight">{asig.description}</p>
                                                    <div className="flex items-center gap-2 mt-1.5">
                                                        <Badge variant="outline" className="text-[10px] font-black text-slate-500 px-2 py-0 h-5 bg-white shadow-sm">{asig.memberName}</Badge>
                                                        {asig.teamName && <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-tighter">{asig.teamName}</span>}
                                                        <span className="text-[10px] text-slate-400 font-medium">
                                                            {new Date(asig.startDate).toLocaleDateString()} - {new Date(asig.endDate).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="opacity-0 group-hover:opacity-100 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                                onClick={async () => {
                                                    if (confirm("¿Eliminar asignación?")) {
                                                        await deleteAssignment(asig.id);
                                                        toast.success("Asignación eliminada");
                                                        window.location.reload();
                                                    }
                                                }}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))
                            ) : (
                                <div className="py-20 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                    <Plus className="w-8 h-8 mx-auto mb-3 opacity-20" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Sin asignaciones registradas</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-indigo-100 shadow-xl rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-50/20 to-white">
                    <CardHeader className="bg-indigo-50/30">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-indigo-600" />
                            <CardTitle className="text-lg font-black text-slate-800">Forecast y Toma de Decisiones</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-8">
                        <div className="p-6 bg-white border border-indigo-100 rounded-3xl shadow-sm space-y-4 hover:shadow-md transition-shadow">
                            <h5 className="text-[10px] font-black uppercase text-indigo-600 tracking-widest flex items-center gap-2">
                                <TrendingUp className="w-3 h-3" />
                                Análisis de Demanda
                            </h5>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Llegada de Tickets</p>
                                    <p className="text-3xl font-black text-slate-900">{forecast.avgTicketsPerWeek.toFixed(1)} <span className="text-xs text-slate-400 font-medium">/ sem</span></p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Carga Predictiva</p>
                                    <p className="text-3xl font-black text-slate-900 text-indigo-600">{forecast.predictedWeeklyHours.toFixed(0)}h <span className="text-xs text-indigo-300 font-medium">/ sem</span></p>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-slate-50">
                                <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                                    "Basado en los últimos 90 días, el equipo recibe una media de <span className="font-black text-slate-900">{forecast.avgTicketsPerWeek.toFixed(1)}</span> tickets semanales que requieren aprox. <span className="font-black text-indigo-600">{forecast.predictedWeeklyHours.toFixed(0)}</span> horas de esfuerzo no planificado."
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Sugerencias AMA Intelligence</h5>

                            <div className="flex items-start gap-4 p-5 bg-emerald-50 rounded-2xl border border-emerald-100 shadow-sm group hover:bg-emerald-100/50 transition-colors">
                                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-200/50">
                                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-emerald-900 leading-relaxed font-medium">
                                        {avgUtilization < 80
                                            ? "El equipo tiene capacidad disponible. Podrías adelantar evolutivos o formación."
                                            : "El equipo está a plena capacidad. Monitoriza las próximas 2 semanas."}
                                    </p>
                                    <p className="text-[9px] text-emerald-600 mt-1 font-black uppercase tracking-tighter">Estado Saludable</p>
                                </div>
                            </div>

                            {workload.members.some(m => m.weeks[0].utilization > 110) && (
                                <div className="flex items-start gap-4 p-5 bg-rose-50 rounded-2xl border border-rose-100 shadow-sm animate-pulse shadow-rose-200/50">
                                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm">
                                        <AlertCircle className="w-6 h-6 text-rose-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-rose-900 leading-relaxed font-black">
                                            ¡Alerta de Bloqueo! Detectada sobrecarga crítica en {workload.members.filter(m => m.weeks[0].utilization > 110).length} miembros.
                                        </p>
                                        <p className="text-[10px] text-rose-600 mt-1 font-medium">Considera reasignar tickets para evitar cuellos de botella.</p>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-start gap-4 p-5 bg-indigo-50 rounded-2xl border border-indigo-100 shadow-sm group hover:bg-indigo-100/50 transition-colors">
                                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm">
                                    <Briefcase className="w-6 h-6 text-indigo-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-indigo-900 leading-relaxed font-medium">
                                        La carga predictiva ({forecast.predictedWeeklyHours.toFixed(0)}h) consume el <span className="font-black">{(forecast.predictedWeeklyHours / totalCapacity * 100).toFixed(0)}%</span> del equipo total.
                                    </p>
                                    <p className="text-[9px] text-indigo-600 mt-1 font-black uppercase tracking-tighter">Análisis Planificación</p>
                                </div>
                            </div>
                        </div>

                    </CardContent>
                </Card>
            </div>
            {/* Detail Dialog */}
            <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
                <DialogContent className="max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black text-slate-800 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-indigo-500" />
                            Detalle de Carga - {selectedWeekDetail?.memberName}
                        </DialogTitle>
                        <DialogDescription className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">
                            Semana del {selectedWeekDetail?.weekStart && new Date(selectedWeekDetail.weekStart).toLocaleDateString()}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* Tickets Section */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center justify-between">
                                <span>Tickets Jira</span>
                                <Badge variant="outline" className="bg-slate-50">{selectedWeekDetail?.tickets?.length || 0}</Badge>
                            </h4>
                            <div className="grid gap-2">
                                {selectedWeekDetail?.tickets?.length > 0 ? (
                                    selectedWeekDetail.tickets.map((t: any, i: number) => (
                                        <div key={i} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white transition-colors flex items-center justify-between group">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[10px] font-black text-indigo-600 px-1.5 py-0.5 bg-indigo-50 rounded border border-indigo-100">{t.key}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase truncate">{t.type}</span>
                                                    {t.isUrgent && <Badge className="bg-rose-500 text-white text-[8px] h-4">URGENTE</Badge>}
                                                </div>
                                                <p className="text-sm font-bold text-slate-800 truncate group-hover:text-dark-green transition-colors">{t.summary}</p>
                                                <div className="flex items-center gap-3 mt-1.5">
                                                    {t.dueDate && (
                                                        <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" /> {new Date(t.dueDate).toLocaleDateString()}
                                                        </p>
                                                    )}
                                                    {t.totalTicketHours > t.hours && (
                                                        <p className="text-[9px] font-black text-indigo-400 flex items-center gap-1 uppercase">
                                                            <RefreshCw className="w-2.5 h-2.5" /> Repartido en varias semanas ({t.totalTicketHours.toFixed(1)}h total)
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="ml-4 text-right">
                                                <p className="text-sm font-black text-slate-900">{t.hours.toFixed(1)}h</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase">Esta semana</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-slate-400 italic py-4 text-center border border-dashed rounded-xl">No hay tickets asignados para esta semana</p>
                                )}
                            </div>
                        </div>

                        {/* Assignments Section */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center justify-between">
                                <span>Tareas Manuales</span>
                                <Badge variant="outline" className="bg-slate-50">{selectedWeekDetail?.assignments?.length || 0}</Badge>
                            </h4>
                            <div className="grid gap-2">
                                {selectedWeekDetail?.assignments?.length > 0 ? (
                                    selectedWeekDetail.assignments.map((asig: any, i: number) => (
                                        <div key={i} className="p-4 rounded-xl border border-indigo-50 bg-indigo-50/20 flex items-center justify-between">
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-indigo-900">{asig.description}</p>
                                            </div>
                                            <div className="ml-4 text-right">
                                                <p className="text-sm font-black text-indigo-600">{asig.hours.toFixed(1)}h</p>
                                                <p className="text-[9px] font-bold text-indigo-400 uppercase">Prorrateo</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-slate-400 italic py-4 text-center border border-dashed rounded-xl">No hay tareas manuales para esta semana</p>
                                )}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
