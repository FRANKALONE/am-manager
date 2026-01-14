'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft, Calendar } from 'lucide-react';

export default function TimelinePlaceholder() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8 text-center">
                <div className="flex items-center justify-start">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors font-medium"
                    >
                        <ChevronLeft className="w-5 h-5" />
                        Volver
                    </button>
                </div>

                <div className="py-20 flex flex-col items-center">
                    <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6">
                        <Calendar className="w-10 h-10" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Línea Temporal de Evolutivos</h1>
                    <p className="text-gray-600 max-w-md mx-auto">
                        Esta funcionalidad de visualización temporal está siendo adaptada al nuevo sistema de Manager AM.
                        Estará disponible en la próxima actualización.
                    </p>
                    <button
                        onClick={() => router.push('/ama-evolutivos')}
                        className="mt-8 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all"
                    >
                        REGRESAR AL DASHBOARD
                    </button>
                </div>
            </div>
        </div>
    );
}
