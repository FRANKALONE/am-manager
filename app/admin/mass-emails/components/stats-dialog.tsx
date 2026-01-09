"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getMassEmailStats } from "@/app/actions/mass-emails";
import { BarChart, Mail, MailOpen, MousePointerClick } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface StatsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    emailId: string | null;
}

export function StatsDialog({ isOpen, onClose, emailId }: StatsDialogProps) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && emailId) {
            fetchStats();
        }
    }, [isOpen, emailId]);

    const fetchStats = async () => {
        if (!emailId) return;

        setLoading(true);
        const stats = await getMassEmailStats(emailId);
        setData(stats);
        setLoading(false);
    };

    if (!emailId) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BarChart className="w-5 h-5 text-indigo-500" />
                        Estadísticas del Email
                    </DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="text-center py-12">
                        <p className="text-slate-400">Cargando estadísticas...</p>
                    </div>
                ) : data ? (
                    <div className="space-y-6">
                        <div className="grid grid-cols-4 gap-4">
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                <div className="flex items-center gap-2 text-slate-600 mb-2">
                                    <Mail className="w-4 h-4" />
                                    <span className="text-xs font-medium">Enviados</span>
                                </div>
                                <p className="text-2xl font-bold text-slate-800">{data.stats.sent}</p>
                            </div>

                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <div className="flex items-center gap-2 text-green-600 mb-2">
                                    <MailOpen className="w-4 h-4" />
                                    <span className="text-xs font-medium">Abiertos</span>
                                </div>
                                <p className="text-2xl font-bold text-green-800">{data.stats.opened}</p>
                                <p className="text-xs text-green-600 mt-1">{data.stats.openRate}% tasa</p>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-center gap-2 text-blue-600 mb-2">
                                    <MousePointerClick className="w-4 h-4" />
                                    <span className="text-xs font-medium">Clicks</span>
                                </div>
                                <p className="text-2xl font-bold text-blue-800">{data.stats.clicked}</p>
                                <p className="text-xs text-blue-600 mt-1">{data.stats.clickRate}% tasa</p>
                            </div>

                            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                                <div className="flex items-center gap-2 text-indigo-600 mb-2">
                                    <BarChart className="w-4 h-4" />
                                    <span className="text-xs font-medium">Total</span>
                                </div>
                                <p className="text-2xl font-bold text-indigo-800">{data.stats.total}</p>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-sm font-bold text-slate-700 mb-3">Detalles por Destinatario</h3>
                            <div className="border rounded-lg overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nombre</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead>Estado</TableHead>
                                            <TableHead>Último evento</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.recipients.map((recipient: any) => (
                                            <TableRow key={recipient.id}>
                                                <TableCell className="font-medium">
                                                    {recipient.user.name} {recipient.user.surname}
                                                </TableCell>
                                                <TableCell className="text-sm text-slate-600">
                                                    {recipient.user.email}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-xs">
                                                        {recipient.user.role}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {recipient.clickedAt ? (
                                                        <Badge className="bg-blue-100 text-blue-700">Click</Badge>
                                                    ) : recipient.openedAt ? (
                                                        <Badge className="bg-green-100 text-green-700">Abierto</Badge>
                                                    ) : recipient.sentAt ? (
                                                        <Badge variant="outline">Enviado</Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="bg-gray-100">Pendiente</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-xs text-slate-500">
                                                    {recipient.clickedAt ? (
                                                        formatDistanceToNow(new Date(recipient.clickedAt), { addSuffix: true, locale: es })
                                                    ) : recipient.openedAt ? (
                                                        formatDistanceToNow(new Date(recipient.openedAt), { addSuffix: true, locale: es })
                                                    ) : recipient.sentAt ? (
                                                        formatDistanceToNow(new Date(recipient.sentAt), { addSuffix: true, locale: es })
                                                    ) : (
                                                        '-'
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <p className="text-slate-400">No se pudieron cargar las estadísticas</p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
