import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const session = await getAuthSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        // Validate file type (allow common business formats)
        const allowedTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
            'application/vnd.ms-excel', // .xls
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
            'application/msword', // .doc
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp'
        ];

        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { error: 'Formato de archivo no permitido. Solo se aceptan PDF, Excel, Word e imágenes.' },
                { status: 400 }
            );
        }

        // Validate file size (max 10MB for email attachments)
        if (file.size > 10 * 1024 * 1024) {
            return NextResponse.json(
                { error: 'El archivo es demasiado grande. El máximo es 10MB.' },
                { status: 400 }
            );
        }

        // Generate unique filename
        const timestamp = Date.now();
        const filename = `mass-email-attachments/${timestamp}-${file.name.replace(/\s+/g, '_')}`;

        // Upload to Vercel Blob
        const blob = await put(filename, file, {
            access: 'public',
        });

        return NextResponse.json({
            success: true,
            url: blob.url,
            name: file.name
        });

    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { error: 'Error interno al subir el archivo' },
            { status: 500 }
        );
    }
}
