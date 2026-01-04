"use client";

import { useFormState } from "react-dom";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { authenticate } from "@/app/actions/users";
import { LanguageSelector } from "./components/language-selector";
import { useTranslations } from "@/lib/use-translations";

const initialState = {
    error: "",
    redirect: ""
};

export default function LoginPage() {
    const router = useRouter();
    const [state, formAction] = useFormState(authenticate as any, initialState);
    const { t } = useTranslations();

    useEffect(() => {
        if (state?.redirect) {
            router.push(state.redirect);
        }
    }, [state?.redirect, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-200 p-4">
            <Card className="w-full max-w-md shadow-2xl border-t-4 border-t-malachite">
                <CardHeader className="space-y-4">
                    <div className="flex justify-center">
                        <Image
                            src="/logo-am.png"
                            alt="Manager AM"
                            width={120}
                            height={50}
                            className="drop-shadow-sm"
                        />
                    </div>
                    <CardTitle className="text-2xl font-bold text-center text-dark-green">
                        {t('auth.welcome')}
                    </CardTitle>
                    <CardDescription className="text-center">
                        {t('auth.enterCredentials')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={formAction} className="space-y-4">
                        {state?.error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                                {state.error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="email">{t('auth.email')}</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                placeholder="tu@email.com"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">{t('auth.password')}</Label>
                                <Link
                                    href="/login/forgot-password"
                                    className="text-xs text-primary hover:underline font-medium"
                                >
                                    {t('auth.forgotPassword')}
                                </Link>
                            </div>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                required
                            />
                        </div>

                        <div className="space-y-3">
                            <LanguageSelector />

                            <Button type="submit" className="w-full bg-malachite hover:bg-jade transition-colors">
                                {t('auth.login')}
                            </Button>
                        </div>
                    </form>

                </CardContent>
            </Card>
        </div>
    );
}
