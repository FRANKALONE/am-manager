const { PrismaClient } = require('@prisma/client');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Load Env
const envPath = path.join(__dirname, '..', '.env');
const envConfig = fs.readFileSync(envPath, 'utf8');
envConfig.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [key, ...values] = trimmed.split('=');
    if (key && values.length > 0) {
        let value = values.join('=').trim();
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        process.env[key.trim()] = value;
    }
});

console.log("DATABASE_URL:", process.env.DATABASE_URL);

const prisma = new PrismaClient();
const TEMPO_TOKEN = process.env.TEMPO_API_TOKEN;

async function fetchAllTempoAccounts() {
    console.log("Fetching all Tempo accounts...\n");

    let offset = 0;
    let hasMore = true;
    let allAccounts = [];

    while (hasMore) {
        const res = await new Promise((resolve, reject) => {
            const req = https.request(`https://api.tempo.io/4/accounts?offset=${offset}&limit=1000`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${TEMPO_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }, (res) => {
                let data = '';
                res.on('data', c => data += c);
                res.on('end', () => resolve(JSON.parse(data)));
            });
            req.on('error', reject);
            req.end();
        });

        if (res.results && res.results.length > 0) {
            allAccounts = [...allAccounts, ...res.results];
            console.log(`Fetched ${allAccounts.length} accounts so far...`);

            if (res.results.length < 1000) {
                hasMore = false;
            } else {
                offset += 1000;
            }
        } else {
            hasMore = false;
        }
    }

    console.log(`\nTotal Tempo accounts fetched: ${allAccounts.length}\n`);
    return allAccounts;
}

async function populateAccountIds() {
    try {
        // Fetch all Tempo accounts
        const tempoAccounts = await fetchAllTempoAccounts();

        // Create a map: WP Key -> Account ID
        const accountMap = new Map();
        tempoAccounts.forEach(acc => {
            accountMap.set(acc.key, acc.id);
        });

        // Fetch all Work Packages
        const workPackages = await prisma.workPackage.findMany({
            select: { id: true, name: true, tempoAccountId: true }
        });

        console.log(`Found ${workPackages.length} Work Packages in database\n`);

        let updated = 0;
        let notFound = 0;
        let alreadySet = 0;

        for (const wp of workPackages) {
            if (wp.tempoAccountId) {
                console.log(`✓ ${wp.id} - Already has Account ID: ${wp.tempoAccountId}`);
                alreadySet++;
                continue;
            }

            let accountId = accountMap.get(wp.id);

            // If not found and starts with AMA, try replacing with CSE
            if (!accountId && wp.id.startsWith('AMA')) {
                const cseId = wp.id.replace(/^AMA/, 'CSE');
                accountId = accountMap.get(cseId);
                if (accountId) {
                    console.log(`✓ ${wp.id} - Found as ${cseId} with Account ID: ${accountId}`);
                }
            }

            if (accountId) {
                await prisma.workPackage.update({
                    where: { id: wp.id },
                    data: { tempoAccountId: accountId }
                });
                if (!wp.id.startsWith('AMA') || accountMap.get(wp.id)) {
                    console.log(`✓ ${wp.id} - Updated with Account ID: ${accountId}`);
                }
                updated++;
            } else {
                console.log(`✗ ${wp.id} - No matching Tempo account found`);
                notFound++;
            }
        }

        console.log(`\n=== Summary ===`);
        console.log(`Updated: ${updated}`);
        console.log(`Already set: ${alreadySet}`);
        console.log(`Not found in Tempo: ${notFound}`);
        console.log(`Total: ${workPackages.length}`);

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

populateAccountIds();
