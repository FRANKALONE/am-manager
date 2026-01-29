const fs = require('fs');
const path = require('path');

function getEnvVar(name) {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        const match = content.match(new RegExp(`${name}=["']?([^"'\\n]+)["']?`));
        return match ? match[1] : null;
    }
    return null;
}

async function fetchJira(endpoint) {
    const token = getEnvVar('JIRA_API_TOKEN')?.trim();
    const email = getEnvVar('JIRA_USER_EMAIL')?.trim();
    const domain = getEnvVar('JIRA_DOMAIN')?.trim() || getEnvVar('JIRA_URL')?.trim();

    console.log('Domain:', domain);
    console.log('Email:', email);
    console.log('Token exists:', !!token);

    if (!token || !email || !domain) {
        throw new Error("Missing JIRA credentials");
    }

    const url = `${domain}/rest/api/3${endpoint}`;
    const auth = Buffer.from(`${email}:${token}`).toString("base64");

    const headers = {
        "Authorization": `Basic ${auth}`,
        "Accept": "application/json"
    };

    console.log('URL:', url);
    const response = await fetch(url, { headers });
    console.log('Status:', response.status);

    if (!response.ok) {
        const errorBody = await response.text();
        console.log('Error body:', errorBody.substring(0, 500));
        throw new Error(`Jira API Error: ${response.status}`);
    }

    return response.json();
}

async function main() {
    try {
        // Simple test first
        const jql = 'created >= "2024-01-01" AND created <= "2024-12-31"';
        console.log('Testing simple JQL:', jql);

        const result = await fetchJira(`/search?jql=${encodeURIComponent(jql)}&maxResults=0`);
        console.log('SUCCESS! Total:', result.total);

    } catch (err) {
        console.error('ERROR:', err.message);
        console.error(err.stack);
    }
}

main();
