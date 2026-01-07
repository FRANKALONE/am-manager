import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const clients = await prisma.client.findMany({
            where: {
                jiraProjectKey: {
                    not: null
                }
            },
            select: {
                id: true,
                name: true,
                jiraProjectKey: true
            },
            orderBy: { name: 'asc' }
        });

        return NextResponse.json({ clients });
    } catch (error) {
        console.error('Error fetching clients with JIRA:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
