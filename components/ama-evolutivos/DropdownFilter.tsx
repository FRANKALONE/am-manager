// components/ama-evolutivos/DropdownFilter.tsx
// Reusable dropdown filter component for multi-select filtering

'use client';

import { ChevronDown, Check } from 'lucide-react';

interface FilterOption {
    value: string;
    label: string;
}

interface DropdownFilterProps {
    label: string;
    options: FilterOption[];
    selected: string[];
    onChange: (selected: string[]) => void;
    isOpen: boolean;
    onToggle: (e: React.MouseEvent) => void;
}

export function DropdownFilter({
    label,
    options,
    selected,
    onChange,
    isOpen,
    onToggle,
}: DropdownFilterProps) {
    const handleToggleOption = (value: string) => {
        if (selected.includes(value)) {
            onChange(selected.filter(v => v !== value));
        } else {
            onChange([...selected, value]);
        }
    };

    return (
        <div className="relative">
            <button
                onClick={onToggle}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${selected.length > 0
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                    }`}
            >
                {label}
                {selected.length > 0 && (
                    <span className="px-1.5 py-0.5 bg-indigo-600 text-white text-xs rounded-full font-bold">
                        {selected.length}
                    </span>
                )}
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div
                    className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-lg border border-slate-200 z-50 min-w-[200px] max-h-[300px] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-2 space-y-1">
                        {options.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-slate-400 italic">
                                No hay opciones
                            </div>
                        ) : (
                            options.map((option) => (
                                <label
                                    key={option.value}
                                    className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 rounded-md cursor-pointer transition-colors"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selected.includes(option.value)}
                                        onChange={() => handleToggleOption(option.value)}
                                        className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                    />
                                    <span className="text-sm text-slate-700 flex-1">
                                        {option.label}
                                    </span>
                                    {selected.includes(option.value) && (
                                        <Check className="w-4 h-4 text-indigo-600" />
                                    )}
                                </label>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
