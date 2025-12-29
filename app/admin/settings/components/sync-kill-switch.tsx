"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ShieldAlert, Power } from "lucide-react";
import { toggleKillSwitch } from "@/app/actions/parameters";
import { toast } from "sonner";

interface SyncKillSwitchProps {
    initialStatus: boolean;
}

export function SyncKillSwitch({ initialStatus }: SyncKillSwitchProps) {
    const [isActive, setIsActive] = useState(initialStatus);
    const [isLoading, setIsLoading] = useState(false);

    const handleToggle = async () => {
        setIsLoading(true);
        try {
            const nextStatus = !isActive;
            const res = await toggleKillSwitch(nextStatus);
            if (res.success) {
                setIsActive(nextStatus);
                toast.success(nextStatus ? "Parada de emergencia ACTIVADA" : "Parada de emergencia DESACTIVADA");
            } else {
                toast.error("Error al cambiar el estado");
            }
        } catch (error) {
            toast.error("Error de conexión");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className={`border-2 ${isActive ? 'border-red-500 bg-red-50/10' : ''}`}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ShieldAlert className={isActive ? 'text-red-500' : 'text-muted-foreground'} />
                    Control de Sincronización
                </CardTitle>
                <CardDescription>
                    Mecanismo de seguridad para detener procesos masivos en JIRA.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col gap-4">
                    <div className={`p-4 rounded-lg border ${isActive ? 'bg-red-100 border-red-200 text-red-800' : 'bg-green-100 border-green-200 text-green-800'}`}>
                        <div className="flex items-center gap-2 font-bold uppercase text-sm">
                            <AlertTriangle className="w-4 h-4" />
                            {isActive ? 'KILL SWITCH ACTIVADO' : 'SISTEMA OPERATIVO'}
                        </div>
                        <p className="text-xs mt-1">
                            {isActive
                                ? 'La sincronización automática y manual está BLOQUEADA. Los procesos en curso se detendrán al finalizar el Work Package actual.'
                                : 'La sincronización funciona correctamente siguiendo su programación habitual.'}
                        </p>
                    </div>

                    <Button
                        variant={isActive ? "outline" : "destructive"}
                        onClick={handleToggle}
                        disabled={isLoading}
                        className="w-full flex items-center gap-2 font-bold"
                    >
                        <Power className="w-4 h-4" />
                        {isActive ? 'DESACTIVAR PARADA DE EMERGENCIA' : 'ACTIVAR PARADA DE EMERGENCIA'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
