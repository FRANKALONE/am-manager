"use client";

import React, { useRef, useEffect, useState } from 'react';
import {
    Bold, Italic, Underline, List,
    Type, UserPlus, Code, Image as ImageIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface RichTextEditorProps {
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
    const editorRef = useRef<HTMLDivElement>(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Sync initial value and any subsequent changes from props (e.g. language switching)
    useEffect(() => {
        if (isMounted && editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value || '';
        }
    }, [isMounted, value]);

    const execCommand = (command: string, value: string | undefined = undefined) => {
        document.execCommand(command, false, value);
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    const handleInput = () => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    const insertPlaceholder = () => {
        execCommand('insertText', '{name}');
    };

    const handleFontSize = (size: string) => {
        // execCommand 'fontSize' uses 1-7
        execCommand('fontSize', size);
    };

    if (!isMounted) return null;

    return (
        <div className="border rounded-xl flex flex-col overflow-hidden bg-white shadow-sm focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-300 transition-all">
            {/* Toolbar */}
            <div className="bg-slate-50 border-b p-2 flex flex-wrap gap-1 items-center">
                <TooltipProvider>
                    <div className="flex items-center gap-1 pr-2 border-r mr-2">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => execCommand('bold')}>
                                    <Bold className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Negrita</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => execCommand('italic')}>
                                    <Italic className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Cursiva</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => execCommand('underline')}>
                                    <Underline className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Subrayado</TooltipContent>
                        </Tooltip>
                    </div>

                    <div className="flex items-center gap-1 pr-2 border-r mr-2">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => execCommand('insertUnorderedList')}>
                                    <List className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Lista</TooltipContent>
                        </Tooltip>
                    </div>

                    <div className="flex items-center gap-1 pr-2 border-r mr-2">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleFontSize('3')}>
                                    <span className="text-xs font-bold">12px</span>
                                </Button>
                            </TooltipTrigger>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleFontSize('4')}>
                                    <span className="text-sm font-bold">14px</span>
                                </Button>
                            </TooltipTrigger>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleFontSize('5')}>
                                    <span className="text-base font-bold">18px</span>
                                </Button>
                            </TooltipTrigger>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleFontSize('6')}>
                                    <span className="text-lg font-bold">24px</span>
                                </Button>
                            </TooltipTrigger>
                        </Tooltip>
                    </div>

                    <div className="flex items-center gap-1 pr-2 border-r mr-2">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        id="img-upload"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;

                                            const formData = new FormData();
                                            formData.append('file', file);

                                            try {
                                                const res = await fetch('/api/upload-attachment', {
                                                    method: 'POST',
                                                    body: formData
                                                });
                                                const data = await res.json();
                                                if (data.success) {
                                                    execCommand('insertImage', data.url);
                                                    // Style the image slightly after insertion
                                                    if (editorRef.current) {
                                                        const imgs = editorRef.current.getElementsByTagName('img');
                                                        const lateImg = imgs[imgs.length - 1];
                                                        if (lateImg) {
                                                            lateImg.style.maxWidth = '100%';
                                                            lateImg.style.height = 'auto';
                                                            lateImg.style.borderRadius = '8px';
                                                        }
                                                    }
                                                }
                                            } catch (err) {
                                                console.error(err);
                                            }
                                        }}
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                        asChild
                                    >
                                        <label htmlFor="img-upload" className="cursor-pointer flex items-center justify-center">
                                            <ImageIcon className="h-4 w-4 text-purple-600" />
                                        </label>
                                    </Button>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>Insertar Imagen</TooltipContent>
                        </Tooltip>
                    </div>

                    <div className="flex items-center gap-1">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2 text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100 hover:text-blue-700 font-medium text-xs"
                                    onClick={insertPlaceholder}
                                >
                                    <UserPlus className="h-3 w-3 mr-1" />
                                    Insertar {`{name}`}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Añadir variable de nombre</TooltipContent>
                        </Tooltip>
                    </div>
                </TooltipProvider>
            </div>

            {/* Editable Area */}
            <div
                ref={editorRef}
                contentEditable
                onInput={handleInput}
                className="min-h-[300px] p-4 focus:outline-none overflow-y-auto"
                style={{ fontSize: '14px', lineHeight: '1.6' }}
            />

            {placeholder && !value && (
                <div className="absolute top-[88px] left-4 text-slate-400 pointer-events-none text-sm italic">
                    {placeholder}
                </div>
            )}
        </div>
    );
}
