const https = require('https');
const fs = require('fs');

// Simple .env parser
const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value) {
        env[key.trim()] = value.join('=').trim().replace(/^"(.*)"$/, '$1');
    }
});

async function testTempo() {
    const token = env.TEMPO_API_TOKEN;
    const issueId = '88565'; // ID returned by Jira search

    const url = `https://api.tempo.io/4/worklogs/issue/${issueId}`;
    console.log('Fetching:', url);

    const res = await new Promise((resolve) => {
        const req = https.request(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        }, (res) => {
            let data = '';
            res.on('data', (c) => data += c);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, error: e.message, data: data });
                }
            });
        });
        req.end();
    });

    console.log('Status:', res.status);
    console.log('Data:', JSON.stringify(res.data, null, 2));
}

testTempo();
