"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mail, Plus, Send, Calendar, Trash2, Eye, BarChart } from "lucide-react";
import { getMassEmails, deleteMassEmail, sendMassEmail } from "@/app/actions/mass-emails";
import { ComposeDialog } from "./compose-dialog";
import { StatsDialog } from "./stats-dialog";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface MassEmailsViewProps {
    userId: string;
}

export function MassEmailsView({ userId }: MassEmailsViewProps) {
    const [emails, setEmails] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [composeOpen, setComposeOpen] = useState(false);
    const [editingEmail, setEditingEmail] = useState<any>(null);
    const [statsOpen, setStatsOpen] = useState(false);
    const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);

    const fetchEmails = async () => {
        setLoading(true);
        const data = await getMassEmails();
        setEmails(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchEmails();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar este email masivo?")) return;

        const result = await deleteMassEmail(id);
        if (result.success) {
            fetchEmails();
        }
    };

    const handleSend = async (id: string) => {
        if (!confirm("¿Enviar este email a todos los destinatarios?")) return;

        const result = await sendMassEmail(id);
        if (result.success) {
            alert(`Email enviado a ${result.sent} destinatarios. ${result.errors > 0 ? `${result.errors} errores.` : ''}`);
            fetchEmails();
        } else {
            alert("Error al enviar el email: " + result.error);
        }
    };

    const handleViewStats = (emailId: string) => {
        setSelectedEmailId(emailId);
        setStatsOpen(true);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'DRAFT':
                return <Badge variant="outline" className="bg-gray-100">Borrador</Badge>;
            case 'SCHEDULED':
                return <Badge variant="outline" className="bg-blue-100 text-blue-700">Programado</Badge>;
            case 'SENT':
                return <Badge variant="outline" className="bg-green-100 text-green-700">Enviado</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <Mail className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Emails Masivos</h1>
                        <p className="text-sm text-slate-500">Envía comunicaciones a usuarios filtrados</p>
                    </div>
                </div>
                <Button
                    onClick={() => {
                        setEditingEmail(null);
                        setComposeOpen(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Email Masivo
                </Button>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <p className="text-slate-400">Cargando...</p>
                </div>
            ) : emails.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                    <Mail className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 mb-4">No hay emails masivos creados</p>
                    <Button
                        onClick={() => setComposeOpen(true)}
                        variant="outline"
                    >
                        Crear el primero
                    </Button>
                </div>
            ) : (
                <div className="bg-white rounded-lg border shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Asunto</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Destinatarios</TableHead>
                                <TableHead>Tasa Apertura</TableHead>
                                <TableHead>Creado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {emails.map((email) => (
                                <TableRow key={email.id}>
                                    <TableCell className="font-medium">
                                        {email.subject}
                                        <div className="text-xs text-slate-400 mt-1">
                                            Por {email.creator.name} {email.creator.surname}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {getStatusBadge(email.status)}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold">{email.totalRecipients}</span>
                                            {email.sentCount > 0 && (
                                                <span className="text-xs text-slate-500">
                                                    ({email.sentCount} enviado{email.sentCount > 1 ? 's' : ''})
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {email.status === 'SENT' && email.openedCount > 0 ? (
                                            <span className="text-sm font-medium text-green-600">
                                                {email.openRate}%
                                            </span>
                                        ) : (
                                            <span className="text-xs text-slate-400">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-sm text-slate-500">
                                        {formatDistanceToNow(new Date(email.createdAt), { addSuffix: true, locale: es })}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {email.status === 'SENT' && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleViewStats(email.id)}
                                                >
                                                    <BarChart className="w-4 h-4" />
                                                </Button>
                                            )}
                                            {email.status === 'DRAFT' && (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => {
                                                            setEditingEmail(email);
                                                            setComposeOpen(true);
                                                        }}
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-green-600 hover:text-green-700"
                                                        onClick={() => handleSend(email.id)}
                                                    >
                                                        <Send className="w-4 h-4" />
                                                    </Button>
                                                </>
                                            )}
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-red-600 hover:text-red-700"
                                                onClick={() => handleDelete(email.id)}
                                            >
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

            <ComposeDialog
                isOpen={composeOpen}
                onClose={() => {
                    setComposeOpen(false);
                    setEditingEmail(null);
                }}
                onSave={fetchEmails}
                userId={userId}
                editingEmail={editingEmail}
            />

            <StatsDialog
                isOpen={statsOpen}
                onClose={() => {
                    setStatsOpen(false);
                    setSelectedEmailId(null);
                }}
                emailId={selectedEmailId}
            />
        </div>
    );
}
