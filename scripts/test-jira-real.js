
const fs = require('fs');
const path = require('path');

// Manually parse .env to avoid external dependencies for this quick test
const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf-8');

const env = {};
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        env[key] = value;
    }
});

const JIRA_URL = env.JIRA_URL;
const JIRA_EMAIL = env.JIRA_USER_EMAIL;
const JIRA_TOKEN = env.JIRA_API_TOKEN;

if (!JIRA_URL || !JIRA_EMAIL || !JIRA_TOKEN) {
    console.error("Missing credentials in .env");
    console.log("URL:", JIRA_URL);
    console.log("Email:", JIRA_EMAIL);
    console.log("Token:", JIRA_TOKEN ? "Set" : "Missing");
    process.exit(1);
}

// Clean URL
const baseUrl = JIRA_URL.replace(/\/$/, "");
const endpoint = "/rest/api/3/myself";
const url = `${baseUrl}${endpoint}`;

const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_TOKEN}`).toString('base64');

console.log(`Testing connection to ${url}...`);
// console.log(`With User: ${JIRA_EMAIL}`);

async function testConnection() {
    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Authorization": `Basic ${auth}`,
                "Accept": "application/json",
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`HTTP ${response.status}: ${text}`);
        }

        const data = await response.json();
        console.log("✅ Connection Successful!");
        console.log(`Authenticated as: ${data.displayName} (${data.emailAddress})`);
    } catch (error) {
        console.error("❌ Connection Failed:", error.message);
    }
}

testConnection();
