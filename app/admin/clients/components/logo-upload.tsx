"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, X, Check } from "lucide-react";
import Image from "next/image";

interface LogoUploadProps {
    currentLogoUrl?: string | null;
    onLogoChange: (url: string) => void;
}

export function LogoUpload({ currentLogoUrl, onLogoChange }: LogoUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [logoUrl, setLogoUrl] = useState(currentLogoUrl || "");
    const [error, setError] = useState("");

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setError('Solo se permiten archivos de imagen');
            return;
        }

        // Validate file size (2MB)
        if (file.size > 2 * 1024 * 1024) {
            setError('El archivo debe ser menor a 2MB');
            return;
        }

        setError("");
        setUploading(true);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al subir el archivo');
            }

            setLogoUrl(data.url);
            onLogoChange(data.url);
        } catch (err: any) {
            setError(err.message || 'Error al subir el archivo');
        } finally {
            setUploading(false);
        }
    };

    const handleRemove = () => {
        setLogoUrl("");
        onLogoChange("");
    };

    return (
        <div className="space-y-2">
            <Label htmlFor="clientLogo">Logo del Cliente</Label>

            {/* Hidden input to store the URL */}
            <input type="hidden" name="clientLogo" value={logoUrl} />

            {logoUrl ? (
                <div className="flex items-center gap-4 p-4 border rounded-lg bg-slate-50">
                    <div className="relative w-20 h-20 border rounded bg-white flex items-center justify-center overflow-hidden">
                        <Image
                            src={logoUrl}
                            alt="Logo preview"
                            fill
                            className="object-contain p-2"
                        />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-slate-700">Logo cargado</p>
                        <p className="text-xs text-slate-500 truncate max-w-md">{logoUrl}</p>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleRemove}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            ) : (
                <div className="flex items-center gap-2">
                    <Input
                        id="clientLogo"
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        disabled={uploading}
                        className="flex-1"
                    />
                    {uploading && (
                        <div className="flex items-center gap-2 text-sm text-blue-600">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
                            Subiendo...
                        </div>
                    )}
                </div>
            )}

            {error && (
                <p className="text-xs text-red-500">{error}</p>
            )}

            <p className="text-xs text-muted-foreground">
                Formatos: JPG, PNG, SVG. Tamaño máximo: 2MB
            </p>
        </div>
    );
}
