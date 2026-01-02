"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Eye, Clock, CheckCircle2, XCircle } from "lucide-react";
import { ReviewDetailModal } from "./review-detail-modal";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Props {
    initialPendingRequests: any[];
    initialHistoryRequests: any[];
    userId: string;
    userRole?: string;
}

export function ReviewRequestClient({ initialPendingRequests, initialHistoryRequests, userId, userRole }: Props) {
    const [pendingRequests] = useState(initialPendingRequests);
    const [historyRequests] = useState(initialHistoryRequests);
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("pending");

    const handleViewDetails = (request: any) => {
        setSelectedRequest(request);
        setIsModalOpen(true);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "PENDING":
                return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 uppercase text-[10px] font-bold">Pendiente</Badge>;
            case "APPROVED":
                return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 uppercase text-[10px] font-bold">Aprobada</Badge>;
            case "REJECTED":
                return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 uppercase text-[10px] font-bold">Rechazada</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const RequestTable = ({ items, showResolution }: { items: any[], showResolution?: boolean }) => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Work Package</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Estado</TableHead>
                    {showResolution && <TableHead>Resuelto Por</TableHead>}
                    <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {items.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={showResolution ? 7 : 6} className="text-center py-12 text-muted-foreground">
                            {showResolution ? "No hay historial de reclamaciones." : "No hay reclamaciones pendientes."}
                        </TableCell>
                    </TableRow>
                ) : (
                    items.map((request) => (
                        <TableRow key={request.id}>
                            <TableCell>
                                {format(new Date(request.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                            </TableCell>
                            <TableCell className="font-medium">{request.workPackage.clientName}</TableCell>
                            <TableCell>{request.workPackage.name}</TableCell>
                            <TableCell>
                                {request.requestedByUser.name} {request.requestedByUser.surname}
                            </TableCell>
                            <TableCell>{getStatusBadge(request.status)}</TableCell>
                            {showResolution && (
                                <TableCell>
                                    {request.reviewedByUser ? `${request.reviewedByUser.name} ${request.reviewedByUser.surname}` : '-'}
                                </TableCell>
                            )}
                            <TableCell className="text-right">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleViewDetails(request)}
                                    className="hover:text-malachite"
                                >
                                    <Eye className="w-4 h-4 mr-2" />
                                    {showResolution ? "Ver Decisión" : "Gestionar"}
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
    );

    return (
        <div className="space-y-6">
            <Tabs defaultValue="pending">
                <TabsList className="mb-4">
                    <TabsTrigger value="pending" active={activeTab === "pending"} onClick={() => setActiveTab("pending")}>
                        Pendientes ({pendingRequests.length})
                    </TabsTrigger>
                    <TabsTrigger value="history" active={activeTab === "history"} onClick={() => setActiveTab("history")}>
                        Historial ({historyRequests.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="pending" active={activeTab === "pending"}>
                    <Card>
                        <CardHeader className="pb-3 text-dark-green font-bold">
                            <CardTitle>Solicitudes Pendientes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <RequestTable items={pendingRequests} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="history" active={activeTab === "history"}>
                    <Card>
                        <CardHeader className="pb-3 text-dark-green font-bold">
                            <CardTitle>Historial de Decisiones</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <RequestTable items={historyRequests} showResolution />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {selectedRequest && (
                <ReviewDetailModal
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false);
                        setSelectedRequest(null);
                    }}
                    requestId={selectedRequest.id}
                    adminId={userId}
                    userRole={userRole}
                    onStatusUpdate={() => {
                        setIsModalOpen(false);
                        window.location.reload();
                    }}
                />
            )}
        </div>
    );
}

