const https = require('https');
const fs = require('fs');
const path = require('path');

// Manually parse .env
function loadEnv() {
    try {
        const envPath = path.resolve(__dirname, '../.env');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const env = {};
        envContent.split('\n').forEach(line => {
            const parts = line.split('=');
            if (parts.length >= 2) {
                const key = parts[0].trim();
                const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, ''); // strip quotes
                env[key] = val;
            }
        });
        return env;
    } catch (e) {
        console.error("Error reading .env", e);
        return {};
    }
}

const env = loadEnv();

async function main() {
    const apiToken = env.JIRA_API_TOKEN;
    const email = env.JIRA_USER_EMAIL;
    const domain = env.JIRA_URL;

    if (!apiToken || !email || !domain) {
        console.error("Missing env vars (Check .env file)");
        return;
    }

    const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');

    // Test 1: Search Project = AMA
    await searchJira(domain, auth, 'project = "AMA"');

    // Test 2: Search text ~ "AMA" to see where it appears
    await searchJira(domain, auth, 'text ~ "AMA*"');
}

async function searchJira(domain, auth, jql) {
    console.log(`\n--- Searching JQL: ${jql} ---`);
    try {
        // Trying the specific endpoint mentioned in error message
        const response = await fetch(`${domain}/rest/api/3/search`, { // Actually, let's try strict /search first, maybe I had query params? 
            // Wait, previous call had NO query params in URL, only body.
            // Let's try /search/jql if suggested
        });

        // Re-read error: "Migrate to ... /rest/api/3/search/jql"
        const response2 = await fetch(`${domain}/rest/api/3/search`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                jql: jql,
                maxResults: 10,
                fields: ["key", "summary", "project"]
            })
        });

        // Let's try the SUFFIX approach
        const finalUrl = `${domain}/rest/api/3/search`; // Standard
        // Maybe the error is misleading or I misread? 
        // "La API solicitada se ha eliminado. Migra a la API /rest/api/3/search/jql"
        // Let's try that exact path.

        const response3 = await fetch(`${domain}/rest/api/3/search/jql`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                jql: jql,
                maxResults: 10,
                fields: ["key", "summary", "project"]
            })
        });

        if (!response3.ok) {
            console.error("Jira Error:", response3.status, await response3.text());
            return;
        }

        const data = await response3.json();
        console.log(`Found ${data.total} issues.`);
        if (data.issues && data.issues.length > 0) {
            const issue = data.issues[0];
            console.log(`[${issue.key}] ${issue.fields.summary}`);
            console.log("--- FIELDS DUMP ---");
            // Prune nulls for readability
            const cleanFields = {};
            for (const [k, v] of Object.entries(issue.fields)) {
                if (v !== null && v !== undefined) {
                    // Check if value looks like an Account or WP ID
                    const strVal = JSON.stringify(v);
                    if (strVal.includes("AMA")) {
                        console.log(`Found 'AMA' in ${k}:`, strVal.substring(0, 200));
                    }
                    cleanFields[k] = v;

                    // Also look for "Account" in custom field names?
                    // We only see IDs here (customfield_10000). Usually "Account" is distinct.
                }
            }
            // console.log(JSON.stringify(cleanFields, null, 2));
        }
    } catch (e) {
        console.error(e);
    }
}

main();
