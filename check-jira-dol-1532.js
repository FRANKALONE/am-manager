// Emergency script to check what JIRA is returning for DOL-1532
const https = require('https');

const jiraUrl = process.env.JIRA_URL?.trim() || 'https://altim.atlassian.net';
const jiraEmail = process.env.JIRA_USER_EMAIL?.trim();
const jiraToken = process.env.JIRA_API_TOKEN?.trim();

if (!jiraEmail || !jiraToken) {
    console.log('❌ Missing JIRA credentials in .env');
    console.log('Set JIRA_USER_EMAIL and JIRA_API_TOKEN');
    process.exit(1);
}

const searchUrl = new URL(`${jiraUrl}/rest/api/3/issue/DOL-1532`);

const req = https.request({
    hostname: searchUrl.hostname,
    port: 443,
    path: searchUrl.pathname,
    method: 'GET',
    headers: {
        'Authorization': `Basic ${Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64')}`,
        'Accept': 'application/json'
    }
}, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const issue = JSON.parse(data);
            console.log('=== JIRA DATA FOR DOL-1532 ===');
            console.log('Key:', issue.key);
            console.log('Created (raw):', issue.fields.created);

            const createdDate = new Date(issue.fields.created);
            console.log('Created (parsed):', createdDate);
            console.log('getMonth():', createdDate.getMonth(), '(0-indexed)');
            console.log('getMonth() + 1:', createdDate.getMonth() + 1);
            console.log('getFullYear():', createdDate.getFullYear());

            console.log('\n=== CALCULATION ===');
            const year = createdDate.getFullYear();
            const month = createdDate.getMonth() + 1;
            console.log('year =', year);
            console.log('month =', month);
            console.log('Expected: year=2025, month=3');
            console.log('Match:', year === 2025 && month === 3 ? '✅ CORRECT' : '❌ WRONG');
        } catch (e) {
            console.error('Parse error:', e);
            console.log('Raw response:', data);
        }
    });
});

req.on('error', err => console.error('Request error:', err));
req.end();
