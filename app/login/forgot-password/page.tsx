"use client";

import { useFormState } from "react-dom";
import { requestPasswordReset } from "@/app/actions/auth-recovery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

const initialState = {
    error: "",
    success: false,
    message: ""
};

export default function ForgotPasswordPage() {
    const [state, formAction] = useFormState(requestPasswordReset as any, initialState);

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <div className="mb-4">
                        <Link href="/login" className="text-sm text-muted-foreground flex items-center hover:text-primary transition-colors">
                            <ChevronLeft className="w-4 h-4 mr-1" /> Volver al login
                        </Link>
                    </div>
                    <CardTitle className="text-2xl">Recuperar Contraseña</CardTitle>
                    <CardDescription>
                        Introduce tu email y te enviaremos un enlace para restablecer tu contraseña.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={formAction} className="space-y-4">
                        {state?.error && (
                            <Alert variant="destructive">
                                <AlertDescription>{state.error}</AlertDescription>
                            </Alert>
                        )}
                        {state?.success && (
                            <Alert className="bg-green-50 text-green-700 border-green-200">
                                <AlertDescription>{state.message}</AlertDescription>
                            </Alert>
                        )}

                        {!state?.success && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        placeholder="tu@email.com"
                                        required
                                    />
                                </div>
                                <Button type="submit" className="w-full">
                                    Enviar enlace de recuperación
                                </Button>
                            </>
                        )}
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
