const https = require('https');
const fs = require('fs');
const path = require('path');

// Manually load .env file
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        process.env[key] = value;
    }
});

const tempoToken = process.env.TEMPO_API_TOKEN;
const accountId = 'CSE00253MANT0002.1.1';
const from = '2024-10-01';
const to = '2024-10-31';

console.log('Fetching worklogs for account:', accountId);
console.log('Date range:', from, 'to', to);
console.log('');

const url = `https://api.tempo.io/4/worklogs/account/${accountId}?from=${from}&to=${to}&limit=1000&offset=0`;

const req = https.request(url, {
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${tempoToken}`
    }
}, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const result = JSON.parse(data);

            console.log('Response status:', res.statusCode);
            console.log('Total worklogs:', result.results?.length || 0);
            console.log('');

            if (result.results) {
                // Find AIE-290
                const aie290Worklogs = result.results.filter(w => w.issue.key === 'AIE-290');

                if (aie290Worklogs.length > 0) {
                    console.log('✅ Found', aie290Worklogs.length, 'worklogs for AIE-290:');
                    aie290Worklogs.forEach(w => {
                        console.log('  - Date:', w.startDate, 'Hours:', (w.timeSpentSeconds / 3600).toFixed(2));
                    });
                } else {
                    console.log('❌ No worklogs found for AIE-290');

                    // Show all unique issue keys
                    const uniqueIssues = [...new Set(result.results.map(w => w.issue.key))];
                    console.log('\nUnique issues in response:', uniqueIssues.length);
                    console.log('Issues:', uniqueIssues.sort().join(', '));
                }
            }
        } catch (e) {
            console.error('Error parsing response:', e);
            console.log('Raw response:', data.substring(0, 500));
        }
    });
});

req.on('error', (err) => {
    console.error('Request error:', err);
});

req.end();
