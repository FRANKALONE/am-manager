// Script to analyze how worklogs are distributed across assignee and additional responsible
const https = require('https');

const TEMPO_TOKEN = process.env.TEMPO_API_TOKEN?.trim();
const JIRA_URL = process.env.JIRA_URL?.trim();
const JIRA_EMAIL = process.env.JIRA_USER_EMAIL?.trim();
const JIRA_TOKEN = process.env.JIRA_API_TOKEN?.trim();

const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_TOKEN}`).toString('base64');

// AMA-DES team member IDs
const amaDesMembers = [
    '5fb2bf0a4a09640069c5a968', // Marta Vera
    '5fbd070c3b4f5900689bdbf1', // Rafael Landeira
    '5fbd070faca10c00696f4700', // Belen Gordon
    '5fbd071231795a006f70480d', // Daniel Latorre
];

async function fetchTempo(path) {
    return new Promise((resolve, reject) => {
        const req = https.request(`https://api.tempo.io/4${path}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${TEMPO_TOKEN}`,
                'Content-Type': 'application/json'
            }
        }, (res) => {
            let data = '';
            res.on('data', (c) => data += c);
            res.on('end', () => {
                try {
                    if (data.trim()) {
                        resolve(JSON.parse(data));
                    } else {
                        reject(new Error('Empty response'));
                    }
                } catch (e) {
                    console.error('Parse error:', data);
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

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
    console.log('=== Analyzing Worklog Distribution for AMA-DES ===\n');

    // Get worklogs for one AMA-DES member in the last month
    const memberId = amaDesMembers[0];
    const from = '2024-12-01';
    const to = '2024-12-31';

    console.log(`Fetching worklogs for member ${memberId} from ${from} to ${to}...`);
    const worklogs = await fetchTempo(`/worklogs/user/${memberId}?from=${from}&to=${to}`);

    console.log(`Found ${worklogs.results?.length || 0} worklogs`);

    // Group by issue and analyze
    const issueGroups = new Map();

    for (const wl of (worklogs.results || []).slice(0, 20)) {
        const issueKey = wl.issue?.key;
        if (!issueKey) continue;

        if (!issueGroups.has(issueKey)) {
            issueGroups.set(issueKey, []);
        }
        issueGroups.get(issueKey).push({
            seconds: wl.timeSpentSeconds,
            author: wl.author?.accountId
        });
    }

    console.log(`\nAnalyzing ${issueGroups.size} unique issues...\n`);

    for (const [issueKey, logs] of Array.from(issueGroups.entries()).slice(0, 5)) {
        console.log(`\n--- Issue: ${issueKey} ---`);

        // Fetch issue details
        const issue = await fetchJira(`/issue/${issueKey}?fields=assignee,customfield_10119,customfield_10120,summary`);

        console.log(`  Summary: ${issue.fields?.summary}`);
        console.log(`  Assignee: ${issue.fields?.assignee?.displayName || 'None'} (${issue.fields?.assignee?.accountId || 'N/A'})`);

        // Check for additional responsible fields
        if (issue.fields?.customfield_10119) {
            console.log(`  CF 10119: ${JSON.stringify(issue.fields.customfield_10119)}`);
        }
        if (issue.fields?.customfield_10120) {
            console.log(`  CF 10120: ${JSON.stringify(issue.fields.customfield_10120)}`);
        }

        // Analyze worklogs
        const totalSeconds = logs.reduce((sum, l) => sum + l.seconds, 0);
        const byAuthor = new Map();

        for (const log of logs) {
            const current = byAuthor.get(log.author) || 0;
            byAuthor.set(log.author, current + log.seconds);
        }

        console.log(`  Total logged: ${(totalSeconds / 3600).toFixed(2)}h`);
        console.log(`  Contributors:`);
        for (const [author, seconds] of byAuthor.entries()) {
            const pct = ((seconds / totalSeconds) * 100).toFixed(0);
            console.log(`    - ${author}: ${(seconds / 3600).toFixed(2)}h (${pct}%)`);
        }
    }
}

main().catch(console.error);
