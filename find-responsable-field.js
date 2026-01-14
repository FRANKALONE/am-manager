// Quick script to find the "Responsable adicional" custom field
const https = require('https');

const JIRA_URL = process.env.JIRA_URL?.trim();
const JIRA_EMAIL = process.env.JIRA_USER_EMAIL?.trim();
const JIRA_TOKEN = process.env.JIRA_API_TOKEN?.trim();
const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_TOKEN}`).toString('base64');

async function fetchJira(path) {
    return new Promise((resolve, reject) => {
        https.request(`${JIRA_URL}/rest/api/3${path}`, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Accept': 'application/json'
            }
        }, (res) => {
            let data = '';
            res.on('data', (c) => data += c);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject).end();
    });
}

async function main() {
    console.log('Searching for "Responsable adicional" field...\n');

    // Get all custom fields
    const fields = await fetchJira('/field');

    const responsableFields = fields.filter(f =>
        f.name && f.name.toLowerCase().includes('responsable')
    );

    console.log('Found fields with "responsable":');
    responsableFields.forEach(f => {
        console.log(`  - ${f.name} (${f.id}) - Type: ${f.schema?.type || 'N/A'}`);
    });

    // Try to get a sample ticket to see the field
    console.log('\nFetching a sample ticket to see field values...');
    const issue = await fetchJira('/search?jql=project=EVO&maxResults=1');

    if (issue.issues && issue.issues[0]) {
        const sampleIssue = issue.issues[0];
        console.log(`\nSample issue: ${sampleIssue.key}`);

        for (const field of responsableFields) {
            const value = sampleIssue.fields[field.id];
            if (value) {
                console.log(`  ${field.name}: ${JSON.stringify(value)}`);
            }
        }
    }
}

main().catch(console.error);
