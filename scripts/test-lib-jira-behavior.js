const https = require('https');
const fs = require('fs');
const path = require('path');

// Load Env
const envPath = path.join(__dirname, '..', '.env');
const envConfig = fs.readFileSync(envPath).toString();
envConfig.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    if (key && values) process.env[key.trim()] = values.join('=').trim();
});

// --- LIB/JIRA.TS REPLICA ---
async function fetchJiraLib(endpoint, options = {}) {
    const token = process.env.JIRA_API_TOKEN;
    const email = process.env.JIRA_USER_EMAIL;
    const domain = process.env.JIRA_URL || "https://altim-group.atlassian.net"; // Defaulting if missing

    if (!token || !email || !domain) {
        throw new Error("JIRA_API_TOKEN, JIRA_USER_EMAIL or JIRA_URL is not defined");
    }

    let url = `${domain}/rest/api/3${endpoint}`;
    let method = options.method || "GET";
    let body = options.body;

    // Detect search request (The logic in lib/jira.ts)
    if (endpoint.startsWith("/search")) {
        // Mock URL to use searchParams
        // If url is invalid (e.g. valid domain but malformed), this might throw
        try {
            const urlObj = new URL(url);
            const jql = urlObj.searchParams.get("jql");

            if (jql) {
                console.log("[Lib] Creating Magic Body for JQL...");
                url = `${domain}/rest/api/3/search/jql`;
                method = "POST";
                // ... magic body construction (omitted as we use explicit POST in sync.ts)
            }
        } catch (e) { console.error("[Lib] URL Parse Error", e); }
    }

    const auth = Buffer.from(`${email}:${token}`).toString("base64");
    const headers = {
        "Authorization": `Basic ${auth}`,
        "Accept": "application/json",
        "Content-Type": "application/json",
        ...options.headers,
    };

    console.log(`[Lib] Fetching ${method} ${url}`);

    // Node.js HTTPS Request Mimic
    return new Promise((resolve, reject) => {
        const reqOpts = {
            method,
            headers
        };
        const req = https.request(url, reqOpts, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                if (res.statusCode >= 400) {
                    reject(`Error ${res.statusCode}: ${data}`);
                } else {
                    resolve(JSON.parse(data));
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(body);
        req.end();
    });
}

// --- SYNC.TS CALL REPLICA ---
async function run() {
    console.log("--- TEST: sync.ts -> lib/jira.ts Interaction ---");

    const standardTypes = ['"Consulta"', '"BPO"', '"Incidencia de correctivo"', '"Solicitud de servicio"'];
    const evolutivoType = '"Petición de observabilidad"';
    const billingField = "cf[10121]";
    const billingValue = '"T&M contra Bolsa"';

    // Option B JQL
    const partA = `issuetype IN (${standardTypes.join(",")})`;
    const partB = `(issuetype = ${evolutivoType} AND ${billingField} = ${billingValue})`;
    const jql = `project IN ("EUR") AND ((${partA}) OR (${partB})) AND updated >= "2024-01-01"`;

    const body = {
        jql,
        fields: ["id", "issuetype", "customfield_10121"],
        maxResults: 100
    };

    try {
        console.log("[Sync] Calling fetchJira/search/jql...");
        const jiraSearch = await fetchJiraLib(`/search/jql`, {
            method: "POST",
            body: JSON.stringify(body),
            headers: { "Content-Type": "application/json" }
        });

        console.log(`[Sync] Result Issues: ${jiraSearch.issues?.length}`);
    } catch (e) {
        console.error("[Sync] Error:", e);
    }
}

run();
