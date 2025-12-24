const https = require('https');
const fs = require('fs');
const path = require('path');

// Load Env
const envPath = path.join(__dirname, '..', '.env');
const envConfig = fs.readFileSync(envPath, 'utf8');
envConfig.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [key, ...values] = trimmed.split('=');
    if (key && values.length > 0) {
        let value = values.join('=').trim();
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        process.env[key.trim()] = value;
    }
});

const TEMPO_TOKEN = process.env.TEMPO_API_TOKEN;
const JIRA_URL = process.env.JIRA_URL?.trim();
const JIRA_EMAIL = process.env.JIRA_USER_EMAIL?.trim();
const JIRA_TOKEN = process.env.JIRA_API_TOKEN?.trim();

const accountKey = "CSE00081MANT0001.1.1";
const from = "2025-02-01";
const to = "2025-02-28";

console.log(`\n=== Analyzing February 2025 Worklogs ===`);
console.log(`Account: ${accountKey}`);
console.log(`Period: ${from} to ${to}\n`);

async function analyzeFebruaryWorklogs() {
    // 1. Get worklogs from Tempo
    const tempoUrl = `https://api.tempo.io/4/worklogs/account/${accountKey}?from=${from}&to=${to}&limit=1000`;

    const worklogs = await new Promise((resolve, reject) => {
        https.get(tempoUrl, {
            headers: { 'Authorization': `Bearer ${TEMPO_TOKEN}` }
        }, (res) => {
            let data = '';
            res.on('data', (c) => data += c);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed.results || []);
                } catch (e) {
                    resolve([]);
                }
            });
        }).on('error', reject);
    });

    console.log(`Total worklogs from Tempo: ${worklogs.length}`);
    const totalSeconds = worklogs.reduce((sum, log) => sum + (log.timeSpentSeconds || 0), 0);
    console.log(`Total hours (raw): ${(totalSeconds / 3600).toFixed(2)}h\n`);

    // 2. Get issue details from Jira
    const uniqueIssueIds = Array.from(new Set(worklogs.map(log => log.issue.id)));
    console.log(`Unique issues: ${uniqueIssueIds.length}\n`);

    const issueDetails = new Map();
    const BATCH_SIZE = 100;

    for (let i = 0; i < uniqueIssueIds.length; i += BATCH_SIZE) {
        const batch = uniqueIssueIds.slice(i, i + BATCH_SIZE);
        const jql = `id IN (${batch.join(',')})`;
        const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_TOKEN}`).toString('base64');

        const bodyData = JSON.stringify({
            jql,
            maxResults: BATCH_SIZE,
            fields: ['issuetype', 'customfield_10121']
        });

        const jiraRes = await new Promise((resolve, reject) => {
            const req = https.request(`${JIRA_URL}/rest/api/3/search/jql`, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json'
                }
            }, (res) => {
                let data = '';
                res.on('data', (c) => data += c);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        resolve({ issues: [] });
                    }
                });
            });
            req.on('error', reject);
            req.write(bodyData);
            req.end();
        });

        if (jiraRes.issues) {
            jiraRes.issues.forEach(issue => {
                issueDetails.set(issue.id, {
                    issueType: issue.fields.issuetype?.name,
                    billingMode: issue.fields.customfield_10121
                });
            });
        }
    }

    // 3. Analyze by issue type
    const validTypes = ['Consulta', 'BPO', 'Incidencia de correctivo', 'Solicitud de servicio'];
    const typeStats = {};
    let validHours = 0;
    let filteredHours = 0;

    worklogs.forEach(log => {
        const issueId = String(log.issue.id);
        const details = issueDetails.get(issueId);
        const hours = log.timeSpentSeconds / 3600;

        if (!details) {
            typeStats['NO_DETAILS'] = (typeStats['NO_DETAILS'] || 0) + hours;
            filteredHours += hours;
            return;
        }

        const issueType = details.issueType || 'UNKNOWN';
        const billingMode = details.billingMode || 'N/A';
        const key = `${issueType} (${billingMode})`;

        typeStats[key] = (typeStats[key] || 0) + hours;

        // Check if valid
        const isValid = validTypes.includes(issueType) ||
            (issueType === 'Evolutivo' && billingMode === 'T&M contra bolsa');

        if (isValid) {
            validHours += hours;
        } else {
            filteredHours += hours;
        }
    });

    console.log(`=== BREAKDOWN BY ISSUE TYPE ===\n`);
    Object.entries(typeStats)
        .sort((a, b) => b[1] - a[1])
        .forEach(([type, hours]) => {
            const isValid = validTypes.some(vt => type.startsWith(vt)) ||
                (type.includes('Evolutivo') && type.includes('T&M contra bolsa'));
            const marker = isValid ? '✅' : '❌';
            console.log(`${marker} ${type}: ${hours.toFixed(2)}h`);
        });

    console.log(`\n=== SUMMARY ===`);
    console.log(`✅ Valid hours (counted): ${validHours.toFixed(2)}h`);
    console.log(`❌ Filtered hours (excluded): ${filteredHours.toFixed(2)}h`);
    console.log(`📊 Total hours: ${(validHours + filteredHours).toFixed(2)}h`);
}

analyzeFebruaryWorklogs().catch(err => {
    console.error('Error:', err);
});
