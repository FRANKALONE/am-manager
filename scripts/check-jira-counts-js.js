const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

const JIRA_DOMAIN = (process.env.JIRA_URL || process.env.JIRA_DOMAIN || process.env.NEXT_PUBLIC_JIRA_DOMAIN || '').replace(/\/$/, '');
const JIRA_EMAIL = process.env.JIRA_EMAIL || process.env.JIRA_USER_EMAIL || '';
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN || '';

function getAuthHeader() {
    return `Basic ${Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64')}`;
}

async function searchJiraIssues(jql, maxIssues = 5000) {
    const authHeader = getAuthHeader();
    let domain = JIRA_DOMAIN.replace(/\/$/, '');
    if (!domain.startsWith('http')) {
        domain = `https://${domain}`;
    }
    const url = `${domain}/rest/api/3/search/jql`;
    const allIssues = [];
    let startAt = 0;
    const maxResults = 100;

    while (true) {
        const params = new URLSearchParams({
            jql,
            startAt: startAt.toString(),
            maxResults: Math.min(maxResults, maxIssues - allIssues.length).toString(),
            fields: 'id'
        });

        const searchUrl = `${url}?${params.toString()}`;
        const response = await fetch(searchUrl, {
            method: 'GET',
            headers: {
                'Authorization': authHeader,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`JIRA API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const issues = data.issues || [];
        allIssues.push(...issues);

        console.log(`[Jira] Page: startAt=${startAt}, count=${issues.length}, Total=${data.total}`);

        startAt += issues.length;
        if (issues.length === 0 || startAt >= data.total || allIssues.length >= maxIssues) {
            break;
        }
    }
    return allIssues;
}

async function debug() {
    const queries = [
        {
            name: 'Incidencias (Requested)',
            jql: 'projectType = "service_desk" AND issuetype IN ("Incidencia de Correctivo", "Consulta", "Consultas") AND status NOT IN ("Cerrado", "Propuesta de Solución")'
        },
        {
            name: 'Evolutivos (Requested)',
            jql: 'projectType = "service_desk" AND issuetype IN ("Evolutivo", "Petición de Evolutivo", "Evolutivos") AND status NOT IN ("Cerrado", "Entregado en PRO")'
        }
    ];

    for (const q of queries) {
        console.log(`\n--- ${q.name} ---`);
        try {
            const res = await searchJiraIssues(q.jql);
            console.log(`DONE: Total found ${res.length}`);
        } catch (e) {
            console.error(e.message);
        }
    }
}

debug();
