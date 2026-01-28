// scripts/test-jira-simple.ts
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

const JIRA_DOMAIN = (process.env.JIRA_URL || process.env.JIRA_DOMAIN || '').replace(/\/$/, '');
const JIRA_EMAIL = process.env.JIRA_EMAIL || '';
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN || '';

async function test() {
    console.log('--- JIRA SIMPLE DIAGNOSTIC ---');
    console.log('Domain:', JIRA_DOMAIN);
    console.log('Email:', JIRA_EMAIL);

    const authHeader = `Basic ${Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64')}`;
    const url = `${JIRA_DOMAIN}/rest/api/3/search/jql`;

    // Testing days instead of minutes
    const jql = `projectType = "service_desk" AND issuetype IN ("Hitos Evolutivos", "Hito Evolutivo", "Hito") AND statusCategory = done AND resolved >= "-730d" ORDER BY resolved DESC`;

    console.log('\nTesting JQL:', jql);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                jql,
                fields: ['summary', 'status', 'resolutiondate', 'project', 'customfield_10015', 'duedate'],
                maxResults: 20,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`JIRA API error: ${response.status} - ${errorText}`);
            return;
        }

        const data: any = await response.json();
        console.log(`\nSuccess! Found ${data.total} total matching issues.`);
        console.log(`Results in this page: ${data.issues.length}`);

        if (data.issues.length > 0) {
            console.log('\nSample Issues:');
            data.issues.forEach((issue: any) => {
                const project = issue.fields.project;
                const status = issue.fields.status;
                console.log(`- [${issue.key}] ${issue.fields.summary}`);
                console.log(`  Project: ${project.key} (${project.projectTypeKey})`);
                console.log(`  Status: ${status.name} (${status.statusCategory.key})`);
                console.log(`  Resolved: ${issue.fields.resolutiondate || 'N/A'}`);
                console.log(`  Planned (CF10015): ${issue.fields.customfield_10015 || 'N/A'}`);
                console.log(`  Due Date: ${issue.fields.duedate || 'N/A'}`);
            });
        }
    } catch (error) {
        console.error('FETCH FAILED:', error);
    }
}

test();
