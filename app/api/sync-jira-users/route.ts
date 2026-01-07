import { NextRequest, NextResponse } from 'next/server';
import { syncClientJiraUsers } from '@/app/actions/jira-customers';

export async function POST(request: NextRequest) {
    try {
        const { clientId } = await request.json();

        if (!clientId) {
            return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
        }

        const result = await syncClientJiraUsers(clientId);

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error syncing JIRA users:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error'
        }, { status: 500 });
    }
}
