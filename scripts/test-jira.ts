import * as dotenv from 'dotenv';
import path from 'path';

async function test() {
    // Load .env BEFORE imports that use process.env
    dotenv.config({ path: path.join(process.cwd(), '.env.local') });
    dotenv.config({ path: path.join(process.cwd(), '.env') });

    const { getClosedHitos, searchJiraIssues, HITO_TYPES } = await import('../lib/ama-evolutivos/jira');

    console.log('--- JIRA DIAGNOSTIC ---');
    console.log('Domain:', process.env.JIRA_DOMAIN || process.env.JIRA_URL);
    console.log('Email:', process.env.JIRA_EMAIL);

    try {
        console.log('\n1. Testing getClosedHitos()...');
        const count = await getClosedHitos();
        console.log(`Success! Found ${count.length} closed hitos.`);
        if (count.length > 0) {
            console.log('Sample Hito:', count[0].key, count[0].fields.summary);
        }

        console.log('\n2. Testing raw JQL search (Service Desk)...');
        const typesStr = HITO_TYPES.map(t => `"${t}"`).join(', ');
        const jql = `projectType = "service_desk" AND issuetype IN (${typesStr}) AND statusCategory = done AND resolved >= "-30d"`;
        console.log('JQL:', jql);
        const res = await searchJiraIssues(jql, ['id'], 5);
        console.log(`Found ${res.length} matches.`);

    } catch (error) {
        console.error('DIAGNOSTIC FAILED:', error);
    }
}

test();
