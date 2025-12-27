const https = require('https');

async function testTempoAPI() {
    const accountIds = [
        'AMA00012MANT0001.1.1',
        'CSE00012MANT0001.1.1',
        'CSE00012MANT0002.1.1',
        '2386'
    ];

    const from = '2025-01-01';
    const to = '2025-12-31';

    for (const accountId of accountIds) {
        console.log(`\n=== Testing account: ${accountId} ===`);

        const result = await new Promise((resolve) => {
            const url = `https://api.tempo.io/4/worklogs/account/${accountId}?from=${from}&to=${to}&limit=10`;

            const req = https.request(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${process.env.TEMPO_API_TOKEN}`,
                    'Accept': 'application/json'
                }
            }, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        console.log(`Status: ${res.statusCode}`);
                        console.log(`Worklogs found: ${parsed.results?.length || 0}`);
                        if (parsed.results && parsed.results.length > 0) {
                            console.log('Sample:', parsed.results[0].issue?.key, '-', parsed.results[0].timeSpentSeconds / 3600, 'hours');
                        }
                        if (parsed.errors) {
                            console.log('Errors:', parsed.errors);
                        }
                        resolve(parsed);
                    } catch (e) {
                        console.log('Parse error:', e.message);
                        console.log('Raw response:', data.substring(0, 200));
                        resolve({});
                    }
                });
            });

            req.on('error', (err) => {
                console.log('Request error:', err.message);
                resolve({});
            });

            req.end();
        });
    }
}

testTempoAPI().catch(console.error);
