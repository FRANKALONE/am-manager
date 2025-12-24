/**
 * Helper function to fetch Tempo Account ID for a Work Package
 * Tries multiple strategies:
 * 1. Direct match with WP ID
 * 2. If starts with AMA, try replacing with CSE
 * 3. Return null if not found
 */

import https from 'https';

export async function fetchTempoAccountId(wpId: string): Promise<number | null> {
    const TEMPO_TOKEN = process.env.TEMPO_API_TOKEN;

    if (!TEMPO_TOKEN) {
        console.warn('TEMPO_API_TOKEN not configured');
        return null;
    }

    try {
        // Fetch all Tempo accounts (cached would be better in production)
        let offset = 0;
        let hasMore = true;
        const allAccounts: any[] = [];

        while (hasMore && allAccounts.length < 2000) { // Safety limit
            const res: any = await new Promise((resolve, reject) => {
                const req = https.request(`https://api.tempo.io/4/accounts?offset=${offset}&limit=1000`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${TEMPO_TOKEN}`,
                        'Content-Type': 'application/json'
                    }
                }, (res) => {
                    let data = '';
                    res.on('data', (c) => data += c);
                    res.on('end', () => resolve(JSON.parse(data)));
                });
                req.on('error', reject);
                req.end();
            });

            if (res.results && res.results.length > 0) {
                allAccounts.push(...res.results);
                if (res.results.length < 1000) {
                    hasMore = false;
                } else {
                    offset += 1000;
                }
            } else {
                hasMore = false;
            }
        }

        // Strategy 1: Direct match
        const directMatch = allAccounts.find(acc => acc.key === wpId);
        if (directMatch) {
            console.log(`Found Tempo Account ID ${directMatch.id} for ${wpId}`);
            return directMatch.id;
        }

        // Strategy 2: AMA -> CSE replacement
        if (wpId.startsWith('AMA')) {
            const cseId = wpId.replace(/^AMA/, 'CSE');
            const cseMatch = allAccounts.find(acc => acc.key === cseId);
            if (cseMatch) {
                console.log(`Found Tempo Account ID ${cseMatch.id} for ${wpId} (as ${cseId})`);
                return cseMatch.id;
            }
        }

        console.log(`No Tempo Account found for ${wpId}`);
        return null;

    } catch (error) {
        console.error('Error fetching Tempo Account ID:', error);
        return null;
    }
}
