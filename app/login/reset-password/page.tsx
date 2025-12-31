"use client";

import { useFormState } from "react-dom";
import { resetPassword } from "@/app/actions/auth-recovery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const initialState = {
    error: "",
    success: false,
    message: ""
};

export default function ResetPasswordPage() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const [state, formAction] = useFormState(resetPassword as any, initialState);

    if (!token) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-destructive">Token no encontrado</CardTitle>
                        <CardDescription>
                            El enlace que has seguido no parece ser válido. Por favor, solicita uno nuevo.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Link href="/login/forgot-password">
                            <Button className="w-full">Solicitar nuevo enlace</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl">Nueva Contraseña</CardTitle>
                    <CardDescription>
                        Introduce tu nueva contraseña a continuación.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={formAction} className="space-y-4">
                        <input type="hidden" name="token" value={token} />

                        {state?.error && (
                            <Alert variant="destructive">
                                <AlertDescription>{state.error}</AlertDescription>
                            </Alert>
                        )}
                        {state?.success && (
                            <div className="space-y-4 text-center">
                                <Alert className="bg-green-50 text-green-700 border-green-200">
                                    <AlertDescription>{state.message}</AlertDescription>
                                </Alert>
                                <Link href="/login" className="block">
                                    <Button className="w-full">Ir al Login</Button>
                                </Link>
                            </div>
                        )}

                        {!state?.success && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="password">Nueva Contraseña</Label>
                                    <Input
                                        id="password"
                                        name="password"
                                        type="password"
                                        required
                                        minLength={6}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                                    <Input
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type="password"
                                        required
                                        minLength={6}
                                    />
                                </div>
                                <Button type="submit" className="w-full">
                                    Actualizar Contraseña
                                </Button>
                            </>
                        )}
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
