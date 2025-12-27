const https = require('https');

async function testTempoToken() {
    console.log('Testing Tempo API token...');
    console.log('Token exists:', !!process.env.TEMPO_API_TOKEN);
    console.log('Token length:', process.env.TEMPO_API_TOKEN?.length || 0);

    // Test with accounts endpoint first
    const result = await new Promise((resolve) => {
        const url = 'https://api.tempo.io/4/accounts';

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
                console.log('\n=== Accounts endpoint ===');
                console.log(`Status: ${res.statusCode}`);
                try {
                    const parsed = JSON.parse(data);
                    console.log(`Accounts found: ${parsed.results?.length || 0}`);
                    if (parsed.results && parsed.results.length > 0) {
                        console.log('\nFirst 5 accounts:');
                        parsed.results.slice(0, 5).forEach(acc => {
                            console.log(`  - ${acc.key} (ID: ${acc.id}) - ${acc.name}`);
                        });

                        // Look for AZZAM accounts
                        const azzamAccounts = parsed.results.filter(acc =>
                            acc.name?.includes('AZZAM') ||
                            acc.key?.includes('AMA00012') ||
                            acc.key?.includes('CSE00012')
                        );
                        if (azzamAccounts.length > 0) {
                            console.log('\nAZZAM-related accounts found:');
                            azzamAccounts.forEach(acc => {
                                console.log(`  - ${acc.key} (ID: ${acc.id}) - ${acc.name}`);
                            });
                        }
                    }
                    resolve(parsed);
                } catch (e) {
                    console.log('Parse error:', e.message);
                    console.log('Raw response:', data.substring(0, 500));
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

testTempoToken().catch(console.error);
