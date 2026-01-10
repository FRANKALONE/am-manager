"use client";

import React, { useState } from 'react';
import {
    Plus, Trash2, ArrowUp, ArrowDown,
    Layout, Type, Grid, Image as ImageIcon,
    MessageSquare, MousePointer2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export type BlockType = 'hero' | 'features' | 'banner' | 'faq' | 'cta';

export interface LandingBlock {
    id: string;
    type: BlockType;
    content: any;
}

interface LandingBuilderProps {
    value: string; // JSON string
    onChange: (value: string) => void;
}

export function LandingBuilder({ value, onChange }: LandingBuilderProps) {
    const [blocks, setBlocks] = useState<LandingBlock[]>(() => {
        try {
            return value ? JSON.parse(value) : [];
        } catch (e) {
            return [];
        }
    });

    const updateBlocks = (newBlocks: LandingBlock[]) => {
        setBlocks(newBlocks);
        onChange(JSON.stringify(newBlocks));
    };

    const addBlock = (type: BlockType) => {
        const newBlock: LandingBlock = {
            id: Math.random().toString(36).substr(2, 9),
            type,
            content: getDefaultContent(type)
        };
        updateBlocks([...blocks, newBlock]);
    };

    const removeBlock = (id: string) => {
        updateBlocks(blocks.filter(b => b.id !== id));
    };

    const moveBlock = (index: number, direction: 'up' | 'down') => {
        const newBlocks = [...blocks];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex >= 0 && targetIndex < newBlocks.length) {
            [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
            updateBlocks(newBlocks);
        }
    };

    const updateBlockContent = (id: string, newContent: any) => {
        updateBlocks(blocks.map(b => b.id === id ? { ...b, content: newContent } : b));
    };

    const getDefaultContent = (type: BlockType) => {
        switch (type) {
            case 'hero': return { title: 'Título Impactante', subtitle: 'Descripción corta y persuasiva.', alignment: 'center', bgGradient: 'blue' };
            case 'features': return { title: 'Nuestros Servicios', items: [{ title: 'Servicio 1', desc: 'Descripción del servicio' }] };
            case 'banner': return { title: 'Mensaje Destacado', text: 'Cuerpo del mensaje', bgImage: '' };
            case 'faq': return { title: 'Preguntas Frecuentes', items: [{ q: '¿Cómo funciona?', a: 'Respuesta detallada.' }] };
            case 'cta': return { text: '¡Únete ahora!', buttonText: 'Empezar', link: '#' };
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-2 p-4 bg-slate-50 border rounded-xl">
                <p className="w-full text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Añadir Bloque</p>
                <Button variant="outline" size="sm" onClick={() => addBlock('hero')} className="bg-white">
                    <Layout className="w-4 h-4 mr-2 text-blue-500" /> Hero
                </Button>
                <Button variant="outline" size="sm" onClick={() => addBlock('features')} className="bg-white">
                    <Grid className="w-4 h-4 mr-2 text-green-500" /> Servicios
                </Button>
                <Button variant="outline" size="sm" onClick={() => addBlock('banner')} className="bg-white">
                    <ImageIcon className="w-4 h-4 mr-2 text-purple-500" /> Banner
                </Button>
                <Button variant="outline" size="sm" onClick={() => addBlock('faq')} className="bg-white">
                    <MessageSquare className="w-4 h-4 mr-2 text-amber-500" /> FAQ
                </Button>
                <Button variant="outline" size="sm" onClick={() => addBlock('cta')} className="bg-white">
                    <MousePointer2 className="w-4 h-4 mr-2 text-rose-500" /> Botón CTA
                </Button>
            </div>

            <div className="space-y-4">
                {blocks.map((block, index) => (
                    <Card key={block.id} className="group border-slate-200 hover:border-blue-300 transition-colors shadow-none">
                        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between bg-slate-50/50 rounded-t-xl border-b">
                            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-700 capitalize">
                                {block.type === 'hero' && <Layout className="w-4 h-4" />}
                                {block.type === 'features' && <Grid className="w-4 h-4" />}
                                {block.type === 'banner' && <ImageIcon className="w-4 h-4" />}
                                {block.type === 'faq' && <MessageSquare className="w-4 h-4" />}
                                {block.type === 'cta' && <MousePointer2 className="w-4 h-4" />}
                                {block.type}
                            </CardTitle>
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveBlock(index, 'up')} disabled={index === 0}>
                                    <ArrowUp className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveBlock(index, 'down')} disabled={index === blocks.length - 1}>
                                    <ArrowDown className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => removeBlock(block.id)}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            {block.type === 'hero' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Título</Label>
                                        <Input value={block.content.title} onChange={e => updateBlockContent(block.id, { ...block.content, title: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Fondo (Color)</Label>
                                        <Select value={block.content.bgGradient} onValueChange={v => updateBlockContent(block.id, { ...block.content, bgGradient: v })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="blue">Azul Profesional</SelectItem>
                                                <SelectItem value="green">Verde Altim</SelectItem>
                                                <SelectItem value="dark">Negro Elegante</SelectItem>
                                                <SelectItem value="slate">Gris Moderno</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <Label>Subtítulo</Label>
                                        <Textarea value={block.content.subtitle} onChange={e => updateBlockContent(block.id, { ...block.content, subtitle: e.target.value })} />
                                    </div>
                                </div>
                            )}

                            {block.type === 'features' && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Título de la Sección</Label>
                                        <Input value={block.content.title} onChange={e => updateBlockContent(block.id, { ...block.content, title: e.target.value })} />
                                    </div>
                                    <div className="space-y-3 pt-2 border-t">
                                        {block.content.items.map((item: any, i: number) => (
                                            <div key={i} className="bg-slate-50 p-3 rounded-lg flex gap-3 items-start border">
                                                <div className="flex-1 space-y-2">
                                                    <Input placeholder="Nombre del servicio" value={item.title} onChange={e => {
                                                        const newItems = [...block.content.items];
                                                        newItems[i].title = e.target.value;
                                                        updateBlockContent(block.id, { ...block.content, items: newItems });
                                                    }} />
                                                    <Input placeholder="Descripción corta" value={item.desc} onChange={e => {
                                                        const newItems = [...block.content.items];
                                                        newItems[i].desc = e.target.value;
                                                        updateBlockContent(block.id, { ...block.content, items: newItems });
                                                    }} />
                                                </div>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={() => {
                                                    const newItems = block.content.items.filter((_: any, idx: number) => idx !== i);
                                                    updateBlockContent(block.id, { ...block.content, items: newItems });
                                                }}>
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        ))}
                                        <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => {
                                            updateBlockContent(block.id, { ...block.content, items: [...block.content.items, { title: '', desc: '' }] });
                                        }}>
                                            <Plus className="w-3 h-3 mr-1" /> Añadir Ítem
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* FAQ, Banner y CTA simplificados por brevedad, pero funcionales */}
                            {(block.type === 'banner' || block.type === 'cta') && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>{block.type === 'banner' ? 'Título del Banner' : 'Texto Principal'}</Label>
                                        <Input value={block.content.title || block.content.text} onChange={e => updateBlockContent(block.id, { ...block.content, [block.type === 'banner' ? 'title' : 'text']: e.target.value })} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        {block.type === 'cta' && (
                                            <>
                                                <div className="space-y-2">
                                                    <Label>Texto el Botón</Label>
                                                    <Input value={block.content.buttonText} onChange={e => updateBlockContent(block.id, { ...block.content, buttonText: e.target.value })} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Enlace (URL)</Label>
                                                    <Input value={block.content.link} onChange={e => updateBlockContent(block.id, { ...block.content, link: e.target.value })} />
                                                </div>
                                            </>
                                        )}
                                        {block.type === 'banner' && (
                                            <div className="space-y-2 col-span-2">
                                                <Label>Texto del Banner</Label>
                                                <Textarea value={block.content.text} onChange={e => updateBlockContent(block.id, { ...block.content, text: e.target.value })} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {block.type === 'faq' && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Título FAQ</Label>
                                        <Input value={block.content.title} onChange={e => updateBlockContent(block.id, { ...block.content, title: e.target.value })} />
                                    </div>
                                    <div className="space-y-3 pt-2 border-t">
                                        {block.content.items.map((item: any, i: number) => (
                                            <div key={i} className="bg-slate-50 p-3 rounded-lg space-y-2 border">
                                                <div className="flex justify-between items-center">
                                                    <Label className="text-[10px] uppercase text-slate-400">Pregunta {i + 1}</Label>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400" onClick={() => {
                                                        const newItems = block.content.items.filter((_: any, idx: number) => idx !== i);
                                                        updateBlockContent(block.id, { ...block.content, items: newItems });
                                                    }}>
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                                <Input placeholder="Pregunta" value={item.q} onChange={e => {
                                                    const newItems = [...block.content.items];
                                                    newItems[i].q = e.target.value;
                                                    updateBlockContent(block.id, { ...block.content, items: newItems });
                                                }} />
                                                <Textarea placeholder="Respuesta" value={item.a} onChange={e => {
                                                    const newItems = [...block.content.items];
                                                    newItems[i].a = e.target.value;
                                                    updateBlockContent(block.id, { ...block.content, items: newItems });
                                                }} />
                                            </div>
                                        ))}
                                        <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => {
                                            updateBlockContent(block.id, { ...block.content, items: [...block.content.items, { q: '', a: '' }] });
                                        }}>
                                            <Plus className="w-3 h-3 mr-1" /> Añadir Pregunta
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {blocks.length === 0 && (
                <div className="text-center py-20 border-2 border-dashed rounded-2xl bg-slate-50 border-slate-200">
                    <Layout className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">Aún no hay bloques. ¡Añade el primero arriba!</p>
                </div>
            )}
        </div>
    );
}
