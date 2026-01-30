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
    const email = getEnvVar('JIRA_EMAIL')?.trim();
    const domain = getEnvVar('NEXT_PUBLIC_JIRA_DOMAIN')?.trim();

    const url = `${domain}/rest/api/3${endpoint}`;
    const auth = Buffer.from(`${email}:${token}`).toString("base64");

    const headers = { "Authorization": `Basic ${auth}`, "Accept": "application/json" };
    const response = await fetch(url, { headers });
    return response.json();
}

async function main() {
    const jql = 'created >= "2024-01-01" AND created <= "2024-12-31"';
    console.log("Fetching sample issue from /search/jql...");
    const res = await fetchJira(`/search/jql?jql=${encodeURIComponent(jql)}&maxResults=1000&fields=issuetype`);

    if (res.issues) {
        console.log("Issues found:", res.issues.length);
        if (res.issues.length > 0) {
            console.log("Sample issue:", JSON.stringify(res.issues[0], null, 2));
        }
    } else {
        console.log("No issues property in response:", JSON.stringify(res, null, 2));
    }
}

main();
