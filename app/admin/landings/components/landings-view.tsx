"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Globe, Plus, Trash2, Eye, BarChart, Power } from "lucide-react";
import { getLandings, deleteLanding, updateLanding } from "@/app/actions/landings";
import { LandingFormDialog } from "./landing-form-dialog";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

interface LandingsViewProps {
    userId: string;
}

export function LandingsView({ userId }: LandingsViewProps) {
    const [landings, setLandings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [formOpen, setFormOpen] = useState(false);
    const [editingLanding, setEditingLanding] = useState<any>(null);

    const fetchLandings = async () => {
        setLoading(true);
        const data = await getLandings();
        setLandings(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchLandings();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("¿Eliminar esta landing page?")) return;
        await deleteLanding(id);
        fetchLandings();
    };

    const toggleActive = async (id: string, isActive: boolean) => {
        await updateLanding(id, { isActive: !isActive });
        fetchLandings();
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                        <Globe className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Landing Pages Temporales</h1>
                        <p className="text-sm text-slate-500">Crea páginas personalizadas para roles específicos</p>
                    </div>
                </div>
                <Button onClick={() => { setEditingLanding(null); setFormOpen(true); }} className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Nueva Landing Page
                </Button>
            </div>

            {/* Guía de uso rápido */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2 text-purple-700">
                        <Badge className="bg-purple-200 text-purple-800 hover:bg-purple-200 border-none">1</Badge>
                        <span className="font-bold text-sm">Crea el Contenido</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                        Usa el botón "Nueva Landing Page" para definir el título y el <strong>Slug</strong> (ej: "bienvenida"). La página será accesible en <code>/landing/tu-slug</code>.
                    </p>
                </div>
                <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2 text-purple-700">
                        <Badge className="bg-purple-200 text-purple-800 hover:bg-purple-200 border-none">2</Badge>
                        <span className="font-bold text-sm">Configura el Acceso</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                        Selecciona qué <strong>Roles</strong> o <strong>Clientes</strong> específicos pueden verla. Solo los usuarios que cumplan el filtro podrán entrar.
                    </p>
                </div>
                <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2 text-purple-700">
                        <Badge className="bg-purple-200 text-purple-800 hover:bg-purple-200 border-none">3</Badge>
                        <span className="font-bold text-sm">Publica y Difunde</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                        Marca <strong>"Mostrar en Cabecera"</strong> para que aparezca en su menú principal, o envía el enlace por email masivo.
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12"><p className="text-slate-400">Cargando...</p></div>
            ) : landings.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed">
                    <Globe className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 mb-4">No hay landing pages creadas</p>
                    <Button onClick={() => setFormOpen(true)} variant="outline">Crear la primera</Button>
                </div>
            ) : (
                <div className="bg-white rounded-lg border shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Título</TableHead>
                                <TableHead>Slug</TableHead>
                                <TableHead>Roles</TableHead>
                                <TableHead>Vistas</TableHead>
                                <TableHead>En Nav</TableHead>
                                <TableHead>Activa</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {landings.map((landing) => (
                                <TableRow key={landing.id}>
                                    <TableCell className="font-medium">{landing.title}</TableCell>
                                    <TableCell><code className="text-xs bg-slate-100 px-2 py-1 rounded">/{landing.slug}</code></TableCell>
                                    <TableCell><span className="text-xs">{landing.allowedRoles}</span></TableCell>
                                    <TableCell><Badge variant="outline">{landing.viewCount}</Badge></TableCell>
                                    <TableCell>{landing.showInHeader ? <Badge className="bg-blue-100 text-blue-700">Sí</Badge> : <Badge variant="outline">No</Badge>}</TableCell>
                                    <TableCell>
                                        <Switch checked={landing.isActive} onCheckedChange={() => toggleActive(landing.id, landing.isActive)} />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button size="sm" variant="ghost" onClick={() => window.open(`/landing/${landing.slug}`, '_blank')}>
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => { setEditingLanding(landing); setFormOpen(true); }}>
                                                Editar
                                            </Button>
                                            <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDelete(landing.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            <LandingFormDialog isOpen={formOpen} onClose={() => { setFormOpen(false); setEditingLanding(null); }} onSave={fetchLandings} userId={userId} editingLanding={editingLanding} />
        </div>
    );
}
