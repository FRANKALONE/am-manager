import * as dotenv from 'dotenv';
import path from 'path';

async function test() {
    // Load .env BEFORE imports that use process.env
    dotenv.config({ path: path.join(process.cwd(), '.env.local') });
    dotenv.config({ path: path.join(process.cwd(), '.env') });

    const { searchJiraIssues, HITO_TYPES } = await import('../lib/ama-evolutivos/jira');

    console.log('--- SEARCHING FOR REPLANNING FIELD ---');

    try {
        const typesStr = HITO_TYPES.map(t => `"${t}"`).join(', ');
        const jql = `projectType = "service_desk" AND issuetype IN (${typesStr}) AND statusCategory = done ORDER BY resolved DESC`;

        // Fetch one recent hito with ALL fields
        const issues = await searchJiraIssues(jql, ['*all'], 1);

        if (issues.length > 0) {
            const issue = issues[0];
            console.log('\n=== SAMPLE HITO ===');
            console.log('Key:', issue.key);
            console.log('Summary:', issue.fields.summary);

            console.log('\n=== DATE FIELDS ===');
            Object.keys(issue.fields).forEach(key => {
                const value = issue.fields[key];
                if (key.includes('date') || key.includes('Date') || key.includes('fecha') || key.includes('Fecha') || key.startsWith('customfield_')) {
                    if (value && typeof value === 'string' && value.match(/\d{4}-\d{2}-\d{2}/)) {
                        console.log(`${key}: ${value}`);
                    }
                }
            });
        }
    } catch (error) {
        console.error('ERROR:', error);
    }
}

test();
