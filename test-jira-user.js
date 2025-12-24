const https = require('https');

// Test fetching a user from Jira
const accountId = '712020:3a227a29-50c8-48d2-8a6c-aafaf72abd17'; // From the Tempo response

// You need to set these environment variables or replace them
const jiraUrl = process.env.JIRA_URL || 'YOUR_JIRA_URL';
const jiraEmail = process.env.JIRA_USER_EMAIL || 'YOUR_EMAIL';
const jiraToken = process.env.JIRA_API_TOKEN || 'YOUR_TOKEN';

const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');

console.log(`\n🔍 Testing Jira User API for accountId: ${accountId}\n`);

https.get(`${jiraUrl}/rest/api/3/user?accountId=${accountId}`, {
    headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
    }
}, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log(`Status Code: ${res.statusCode}\n`);

        if (res.statusCode === 200) {
            try {
                const user = JSON.parse(data);
                console.log('✅ User Details:');
                console.log('='.repeat(80));
                console.log(JSON.stringify(user, null, 2));
                console.log('='.repeat(80));
                console.log(`\nDisplay Name: ${user.displayName}`);
                console.log(`Email: ${user.emailAddress}`);
                console.log(`Account ID: ${user.accountId}`);
            } catch (e) {
                console.error('❌ Failed to parse response:', e.message);
                console.log('Raw data:', data);
            }
        } else {
            console.error('❌ Error response:');
            console.log(data);
        }
    });
}).on('error', err => {
    console.error('❌ Request error:', err.message);
});
