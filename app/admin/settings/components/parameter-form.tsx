"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createParameter } from "@/app/actions/parameters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, AlertCircle, CheckCircle2 } from "lucide-react";
import { useEffect, useRef } from "react";

const initialState: any = {
    message: null,
    error: null
};

export function ParameterForm({ category }: { category: string }) {
    const [state, formAction] = useFormState(createParameter, initialState);
    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        if (state.message) {
            formRef.current?.reset();
        }
    }, [state.message]);

    return (
        <form ref={formRef} action={formAction} className="space-y-2">
            <input type="hidden" name="category" value={category} />
            <div className="flex gap-2">
                <div className="grid gap-1 flex-1">
                    <Input name="label" placeholder="Nombre (ej: Bolsa X)" required />
                </div>
                <div className="grid gap-1 w-1/3">
                    <Input name="value" placeholder="VALOR_INTERNO" required />
                </div>
                <SubmitButton />
            </div>
            {state.error && (
                <div className="flex items-center gap-2 text-xs text-red-500 font-medium bg-red-50 p-2 rounded border border-red-100 animate-in fade-in slide-in-from-top-1">
                    <AlertCircle className="w-3 h-3" />
                    {state.error}
                </div>
            )}
            {state.message && (
                <div className="flex items-center gap-2 text-xs text-green-600 font-medium bg-green-50 p-2 rounded border border-green-100 animate-in fade-in slide-in-from-top-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {state.message}
                </div>
            )}
        </form>
    );
}

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button size="icon" type="submit" disabled={pending}>
            {pending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
                <Plus className="w-4 h-4" />
            )}
        </Button>
    );
}
