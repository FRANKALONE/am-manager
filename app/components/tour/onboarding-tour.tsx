"use client";

import { useEffect, useState } from "react";
import { X, ChevronRight, ChevronLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { completeOnboardingTour } from "@/app/actions/tour";
import { cn } from "@/lib/utils";

interface Step {
    title: string;
    content: string;
    selector?: string;
    position?: "right" | "left" | "top" | "bottom" | "center";
}

const steps: Step[] = [
    {
        title: "¡Bienvenido a AM Manager!",
        content: "Esta plataforma está diseñada para ayudarte a gestionar y visualizar tus servicios AM de forma transparente. Vamos a darte un breve paseo por las funciones principales.",
        position: "center"
    },
    {
        title: "Consumos en Tiempo Real",
        content: "En el dashboard principal podrás ver el estado de tus bolsas de horas y mantenimientos actualizados diariamente.",
        selector: "#dashboard-main-card",
        position: "bottom"
    },
    {
        title: "Evolutivos e Hitos",
        content: "Accede al seguimiento detallado de tus proyectos evolutivos, fechas de entrega y responsables desde aquí.",
        selector: "#evolutivos-card",
        position: "left"
    },
    {
        title: "Solicitud de Revisiones",
        content: "Si tienes alguna duda sobre una imputación, puedes solicitar una revisión directamente desde el detalle mensual.",
        selector: "#monthly-detail-table",
        position: "top"
    },
    {
        title: "Tus Preferencias",
        content: "Puedes cambiar el idioma, el formato de fecha y volver a iniciar esta guía en cualquier momento desde tu perfil.",
        selector: "#user-profile-trigger",
        position: "bottom"
    },
    {
        title: "¡Todo listo!",
        content: "Ya puedes empezar a usar la plataforma. Si necesitas ayuda adicional, contacta con tu gestor AM.",
        position: "center"
    }
];

interface OnboardingTourProps {
    userId: string;
    hasCompletedTour: boolean;
}

export function OnboardingTour({ userId, hasCompletedTour }: OnboardingTourProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [isOpen, setIsOpen] = useState(!hasCompletedTour);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const handleStartTour = () => {
            setCurrentStep(0);
            setIsOpen(true);
        };

        window.addEventListener('start-onboarding-tour', handleStartTour);
        return () => window.removeEventListener('start-onboarding-tour', handleStartTour);
    }, []);

    if (!mounted || !isOpen) return null;

    const step = steps[currentStep];
    const isFirst = currentStep === 0;
    const isLast = currentStep === steps.length - 1;

    const handleClose = async () => {
        setIsOpen(false);
        if (!hasCompletedTour) {
            await completeOnboardingTour(userId);
        }
    };

    const handleNext = () => {
        if (isLast) {
            handleClose();
        } else {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        setCurrentStep(prev => prev - 1);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm pointer-events-auto" onClick={handleClose} />

            {/* Modal */}
            <div className={cn(
                "relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 w-full max-w-sm pointer-events-auto border border-malachite/20 animate-in fade-in zoom-in duration-300",
                step.position === "center" ? "" : "md:absolute"
            )}>
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
                    title="Cerrar guía"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-malachite uppercase tracking-wider">Paso {currentStep + 1} de {steps.length}</span>
                        <div className="flex gap-1">
                            {steps.map((_, i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        "w-1 h-1 rounded-full bg-slate-200 transition-all",
                                        i === currentStep ? "w-4 bg-malachite" : ""
                                    )}
                                />
                            ))}
                        </div>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{step.title}</h3>
                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                        {step.content}
                    </p>
                </div>

                <div className="flex justify-between items-center">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClose}
                        className="text-slate-400 text-xs hover:bg-transparent hover:text-red-500"
                    >
                        Omitir guía
                    </Button>

                    <div className="flex gap-2">
                        {!isFirst && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handlePrev}
                                className="border-slate-200"
                            >
                                <ChevronLeft className="w-4 h-4 mr-1" />
                                Anterior
                            </Button>
                        )}
                        <Button
                            className="bg-malachite hover:bg-jade text-white shadow-lg shadow-malachite/20"
                            size="sm"
                            onClick={handleNext}
                        >
                            {isLast ? (
                                <>
                                    Fin <Check className="w-4 h-4 ml-1" />
                                </>
                            ) : (
                                <>
                                    Siguiente <ChevronRight className="w-4 h-4 ml-1" />
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
