const https = require('https');

const tempoToken = '1SNa9fAZY21j8AxIdhC8ovVnHqEMb8-us';
const accountId = 'CSE00081MANT0001.1.1';
const from = '2025-02-01';
const to = '2026-01-31';

console.log(`\n🔍 Testing Tempo API for account: ${accountId}\n`);

const url = `https://api.tempo.io/4/worklogs/account/${accountId}?from=${from}&to=${to}&limit=10`;

https.get(url, {
    headers: {
        'Authorization': `Bearer ${tempoToken}`,
        'Content-Type': 'application/json'
    }
}, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log(`Status Code: ${res.statusCode}\n`);

        if (res.statusCode === 200) {
            try {
                const parsed = JSON.parse(data);
                console.log('✅ Response:');
                console.log(JSON.stringify(parsed, null, 2));

                if (parsed.results && parsed.results.length > 0) {
                    console.log(`\n✅ Found ${parsed.results.length} worklogs`);
                } else {
                    console.log('\n⚠️  No worklogs found for this account');
                }
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
