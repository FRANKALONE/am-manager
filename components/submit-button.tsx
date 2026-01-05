"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "./ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/utils";

interface SubmitButtonProps extends ButtonProps {
    loadingText?: string;
}

export function SubmitButton({
    children,
    loadingText,
    className,
    disabled,
    ...props
}: SubmitButtonProps) {
    const { pending } = useFormStatus();

    return (
        <Button
            type="submit"
            disabled={pending || disabled}
            className={cn("relative", className)}
            {...props}
        >
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {loadingText || children}
                </>
            ) : (
                children
            )}
        </Button>
    );
}
