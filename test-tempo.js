const https = require('https');

// Get token from environment (set manually for this test)
const tempoToken = 'YOUR_TEMPO_TOKEN_HERE'; // Replace with actual token
const accountId = 'AMA00081MANT0001.1.2'; // Old WP ID for Europesnacks

// Fetch one worklog from Tempo
const url = `https://api.tempo.io/4/worklogs/account/${accountId}?from=2025-02-01&to=2025-02-28&limit=1`;

https.get(url, {
    headers: {
        'Authorization': `Bearer ${tempoToken}`,
        'Content-Type': 'application/json'
    }
}, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const parsed = JSON.parse(data);
        if (parsed.results && parsed.results.length > 0) {
            console.log('=== TEMPO WORKLOG STRUCTURE ===');
            console.log(JSON.stringify(parsed.results[0], null, 2));
        } else {
            console.log('No worklogs found');
            console.log(JSON.stringify(parsed, null, 2));
        }
    });
}).on('error', err => {
    console.error('Error:', err.message);
});
