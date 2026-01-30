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

async function fetchJira(endpoint, body = null) {
    const token = getEnvVar('JIRA_API_TOKEN')?.trim();
    const email = getEnvVar('JIRA_EMAIL')?.trim();
    const domain = getEnvVar('NEXT_PUBLIC_JIRA_DOMAIN')?.trim();

    const url = `${domain}/rest/api/3${endpoint}`;
    const auth = Buffer.from(`${email}:${token}`).toString("base64");

    const headers = { "Authorization": `Basic ${auth}`, "Accept": "application/json" };
    if (body) headers["Content-Type"] = "application/json";

    const response = await fetch(url, { method: body ? 'POST' : 'GET', headers, body: body ? JSON.stringify(body) : null });
    return { status: response.status, data: await response.json() };
}

async function main() {
    const jql = 'created >= "2024-01-01" AND created <= "2024-12-31"';
    console.log("Testing GET /search...");
    const res1 = await fetchJira(`/search?jql=${encodeURIComponent(jql)}&maxResults=1`);
    console.log("GET /search status:", res1.status, "Keys:", Object.keys(res1.data));
    if (res1.data.total) console.log("GET /search total:", res1.data.total);

    console.log("\nTesting GET /search/jql...");
    const res2 = await fetchJira(`/search/jql?jql=${encodeURIComponent(jql)}&maxResults=1`);
    console.log("GET /search/jql status:", res2.status, "Keys:", Object.keys(res2.data));
}

main();
