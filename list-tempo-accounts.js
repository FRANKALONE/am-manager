require('dotenv').config();
const https = require('https');
const tempoToken = process.env.TEMPO_API_TOKEN?.trim();

async function listAllAccounts() {
    let allAccounts = [];
    let offset = 0;
    const limit = 500;
    let hasMore = true;

    while (hasMore) {
        console.log(`Fetching accounts (offset: ${offset})...`);
        const res = await new Promise((resolve, reject) => {
            const url = `https://api.tempo.io/4/accounts?limit=${limit}&offset=${offset}`;
            const req = https.request(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${tempoToken}`,
                    'Accept': 'application/json'
                }
            }, (res) => {
                let data = '';
                res.on('data', (c) => data += c);
                res.on('end', () => {
                    try { resolve(JSON.parse(data)); }
                    catch (e) { reject(e); }
                });
            });
            req.on('error', reject);
            req.end();
        });

        if (res.results && res.results.length > 0) {
            allAccounts.push(...res.results);
            hasMore = res.results.length === limit;
            offset += limit;
        } else {
            hasMore = false;
        }
    }
    return allAccounts;
}

async function main() {
    try {
        const accounts = await listAllAccounts();
        console.log(`Total accounts found: ${accounts.length}`);

        const searchTerms = ['30313', 'AMA', 'Fuerte', 'MANT0001.1.2'];
        const filtered = accounts.filter(acc => {
            const name = (acc.name || '').toLowerCase();
            const key = (acc.key || '').toLowerCase();
            return searchTerms.some(term =>
                name.includes(term.toLowerCase()) ||
                key.includes(term.toLowerCase())
            );
        });

        console.log('Filtered accounts:');
        console.log(JSON.stringify(filtered, null, 2));
    } catch (e) {
        console.error(e);
    }
}

main();
