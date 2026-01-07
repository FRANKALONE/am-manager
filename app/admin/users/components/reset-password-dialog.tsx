"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Key, Copy, CheckCircle2 } from "lucide-react";
import { resetUserPassword } from "@/app/actions/users";

interface ResetPasswordDialogProps {
    userId: string;
    userName: string;
}

export function ResetPasswordDialog({ userId, userName }: ResetPasswordDialogProps) {
    const [open, setOpen] = useState(false);
    const [tempPassword, setTempPassword] = useState("");
    const [copied, setCopied] = useState(false);
    const [isResetting, setIsResetting] = useState(false);

    const generatePassword = () => {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
        let password = "";
        for (let i = 0; i < 12; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    };

    const handleReset = async () => {
        setIsResetting(true);
        const newPassword = generatePassword();

        const result = await resetUserPassword(userId, newPassword);

        if (result.success) {
            setTempPassword(newPassword);
        } else {
            alert(result.error || "Error al resetear la contraseña");
            setOpen(false);
        }
        setIsResetting(false);
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(tempPassword);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleClose = () => {
        setOpen(false);
        setTempPassword("");
        setCopied(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Resetear contraseña">
                    <Key className="w-4 h-4" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Resetear Contraseña</DialogTitle>
                    <DialogDescription>
                        Resetear la contraseña de {userName}
                    </DialogDescription>
                </DialogHeader>

                {!tempPassword ? (
                    <div className="py-4">
                        <p className="text-sm text-muted-foreground">
                            Se generará una contraseña temporal que el usuario deberá cambiar en su primer inicio de sesión.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Contraseña Temporal</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={tempPassword}
                                    readOnly
                                    className="font-mono"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={copyToClipboard}
                                >
                                    {copied ? (
                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>
                        <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md border border-amber-200">
                            ⚠️ Guarda esta contraseña. No podrás verla de nuevo.
                        </p>
                    </div>
                )}

                <DialogFooter>
                    {!tempPassword ? (
                        <>
                            <Button variant="outline" onClick={handleClose}>
                                Cancelar
                            </Button>
                            <Button onClick={handleReset} disabled={isResetting}>
                                {isResetting ? "Generando..." : "Generar Contraseña"}
                            </Button>
                        </>
                    ) : (
                        <Button onClick={handleClose}>
                            Cerrar
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
