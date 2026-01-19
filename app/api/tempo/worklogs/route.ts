// app/api/tempo/worklogs/route.ts
// API endpoint to fetch Tempo worklogs for a specific Jira issue

import { NextRequest, NextResponse } from 'next/server';

const TEMPO_API_BASE = 'https://api.tempo.io/4';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const issueId = searchParams.get('issueId');

        if (!issueId) {
            return NextResponse.json(
                { error: 'issueId parameter is required' },
                { status: 400 }
            );
        }

        const token = process.env.TEMPO_API_TOKEN;
        if (!token) {
            return NextResponse.json(
                { error: 'TEMPO_API_TOKEN not configured' },
                { status: 500 }
            );
        }

        // Fetch worklogs for this issue
        const url = `${TEMPO_API_BASE}/worklogs/issue/${issueId}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Tempo API error:', errorText);
            return NextResponse.json(
                { error: `Tempo API error: ${response.status}` },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Return the worklogs array
        return NextResponse.json(data.results || []);
    } catch (error: any) {
        console.error('Error fetching Tempo worklogs:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
