import React from 'react';

export function Footer() {
    const currentYear = new Date().getFullYear();
    const version = "2601.3";

    return (
        <footer className="w-full bg-slate-900 text-slate-400 py-6 border-t border-slate-800">
            <div className="container mx-auto px-4">
                <div className="flex flex-col items-center justify-center space-y-2">
                    <p className="text-sm">
                        © {currentYear} Altim Tecnologías de la Información. Todos los derechos reservados.
                    </p>
                    <p className="text-xs font-mono opacity-60">
                        v{version}
                    </p>
                </div>
            </div>
        </footer>
    );
}
