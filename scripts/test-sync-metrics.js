const fetch = require('node-fetch');

async function testSync() {
    const url = 'http://localhost:3000/api/ama-evolutivos/sync-daily';
    try {
        console.log('Fetching sync route...');
        const res = await fetch(url);
        const json = await res.json();
        console.log('Result:', JSON.stringify(json, null, 2));
    } catch (e) {
        console.error('Error:', e.message);
    }
}

testSync();
