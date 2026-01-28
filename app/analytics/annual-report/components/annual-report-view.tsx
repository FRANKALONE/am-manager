'use client';

import { AnnualReportData } from '@/app/actions/analytics-annual';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Users, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

interface Props {
    report: AnnualReportData;
    year: number;
    clientId?: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658', '#ff7c7c'];

export default function AnnualReportView({ report, year }: Props) {
    const formatNumber = (num: number) => num.toLocaleString('es-ES');
    const formatPercent = (num: number) => `${num.toFixed(1)}%`;
    const formatHours = (hours: number) => `${hours.toFixed(1)}h`;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Informe Anual {year}</h1>
                    <p className="text-muted-foreground mt-2">
                        Análisis completo de Evolutivos, Correctivo y Soporte General
                    </p>
                </div>
            </div>

            {/* Executive Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Incidencias</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatNumber(report.totalIncidents)}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Excluyendo evolutivos
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">SLA Primera Respuesta</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatPercent(report.slaFirstResponseCompliance)}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {formatNumber(report.slaMetrics.firstResponse.compliant)} de {formatNumber(report.slaMetrics.firstResponse.total)}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">SLA Resolución</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatPercent(report.slaResolutionCompliance)}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {formatNumber(report.slaMetrics.resolution.compliant)} de {formatNumber(report.slaMetrics.resolution.total)}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Clientes Totales</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatNumber(report.clients.total)}</div>
                        <p className="text-xs text-green-600 mt-1">
                            +{report.clients.newClients.length} nuevos
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Evolutivos Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Evolutivos - Resumen Anual</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Creados</p>
                            <p className="text-2xl font-bold">{formatNumber(report.evolutivos.creados)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Entregados PRO</p>
                            <p className="text-2xl font-bold">{formatNumber(report.evolutivos.entregados)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Solicitadas</p>
                            <p className="text-2xl font-bold">{formatNumber(report.evolutivos.solicitadas)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Enviadas</p>
                            <p className="text-2xl font-bold">{formatNumber(report.evolutivos.enviadas)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Aprobadas</p>
                            <p className="text-2xl font-bold">{formatNumber(report.evolutivos.aprobadas)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Ratio Aceptación</p>
                            <p className="text-2xl font-bold">{formatPercent(report.evolutivos.ratioAceptacion)}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Incidents Volume */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Incidencias por Tipo</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={report.incidentsByType}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="type" angle={-45} textAnchor="end" height={100} />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="count" fill="#0088FE" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Top 10 Componentes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={report.incidentsByComponent} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis dataKey="component" type="category" width={150} />
                                <Tooltip />
                                <Bar dataKey="count" fill="#00C49F" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Monthly Evolution */}
            <Card>
                <CardHeader>
                    <CardTitle>Evolución Mensual</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={report.monthly}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" tickFormatter={(m) => `${m}`} />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="incidents" stroke="#FF8042" name="Incidencias" strokeWidth={2} />
                            <Line type="monotone" dataKey="evolutivos" stroke="#0088FE" name="Evolutivos" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* SLA Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>SLA Primera Respuesta</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <div className="flex justify-between mb-2">
                                <span className="text-sm font-medium">Cumplimiento</span>
                                <span className="text-sm font-medium">{formatPercent(report.slaFirstResponseCompliance)}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div
                                    className="bg-green-600 h-2.5 rounded-full"
                                    style={{ width: `${report.slaFirstResponseCompliance}%` }}
                                ></div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Tiempo Medio</p>
                                <p className="text-xl font-bold">{formatHours(report.slaMetrics.firstResponse.avgTime)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Evaluados</p>
                                <p className="text-xl font-bold">{formatNumber(report.slaMetrics.firstResponse.total)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>SLA Resolución</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <div className="flex justify-between mb-2">
                                <span className="text-sm font-medium">Cumplimiento</span>
                                <span className="text-sm font-medium">{formatPercent(report.slaResolutionCompliance)}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div
                                    className="bg-blue-600 h-2.5 rounded-full"
                                    style={{ width: `${report.slaResolutionCompliance}%` }}
                                ></div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Tiempo Medio</p>
                                <p className="text-xl font-bold">{formatHours(report.slaMetrics.resolution.avgTime)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Evaluados</p>
                                <p className="text-xl font-bold">{formatNumber(report.slaMetrics.resolution.total)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Corrective Metrics */}
            <Card>
                <CardHeader>
                    <CardTitle>Métricas de Correctivo</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <p className="text-sm text-muted-foreground mb-2">MTTR (Tiempo Medio de Resolución)</p>
                            <p className="text-3xl font-bold text-blue-600">{formatHours(report.correctiveMetrics.mttr)}</p>
                        </div>
                        <div className="text-center p-4 bg-orange-50 rounded-lg">
                            <p className="text-sm text-muted-foreground mb-2">Tasa de Reapertura</p>
                            <p className="text-3xl font-bold text-orange-600">{formatPercent(report.correctiveMetrics.reopenRate)}</p>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                            <p className="text-sm text-muted-foreground mb-2">Backlog (Pendientes)</p>
                            <p className="text-3xl font-bold text-purple-600">{formatNumber(report.correctiveMetrics.backlog)}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* New Clients */}
            {report.clients.newClients.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Clientes Nuevos en {year}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {report.clients.newClients.map((client) => (
                                <div key={client.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                    <span className="font-medium">{client.name}</span>
                                    <span className="text-sm text-muted-foreground">
                                        {new Date(client.firstTicketDate).toLocaleDateString('es-ES')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
