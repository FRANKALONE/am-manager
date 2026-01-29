
const JIRA_API_BASE = "https://api.tempo.io/core/3"; // Wait, user said "same URL as Tempo"? 
// Actually, Tempo API is usually https://api.tempo.io/4 
// Jira API is usually https://{your-domain}.atlassian.net/rest/api/3
// The user said "misma URL que para TEMPO". This might mean the *base domain* (e.g. altim-group.atlassian.net).
// I need to be careful. If I look at `lib/tempo.ts`, it uses "https://api.tempo.io/4".
// That is NOT what Jira uses. Jira uses standard Atlassian cloud URLs.
// BUT, maybe the user means they want to use the JIRA_URL variable that might be set.
// Let's assume standard Jira Cloud URL structure if JIRA_URL is not set, or use JIRA_URL if set.
// User said: "misma URL que para TEMPO". Only reasonable interpretation if Tempo is configured with a custom URL (unlikely for Cloud) OR they mean the Atlassian domain.
// However `lib/tempo.ts` has `const TEMPO_API_BASE = "https://api.tempo.io/4";` hardcoded.
// This contradicts "same URL". 
// HYPOTHESIS: User considers the "Jira URL" (e.g. mycompany.atlassian.net) to be "the URL".  
// Let's check if there is a JIRA_URL env var.
// I will assume there is a JIRA_URL or JIRA_DOMAIN env var or I need to ask/find it.
// Wait, I can't see .env. 
// I'll assume I need to use `process.env.JIRA_URL` and fall back or throw error.

export async function fetchJira(endpoint: string, options: RequestInit = {}) {
    // Trim env vars to avoid subtle Auth issues
    const token = process.env.JIRA_API_TOKEN?.trim();
    const email = process.env.JIRA_EMAIL?.trim() || process.env.JIRA_USER_EMAIL?.trim();
    const domain = process.env.NEXT_PUBLIC_JIRA_DOMAIN?.trim() || process.env.JIRA_URL?.trim() || process.env.JIRA_DOMAIN?.trim();

    if (!token || !email || !domain) {
        throw new Error(`JIRA credentials missing: token=${!!token}, email=${!!email}, domain=${!!domain}`);
    }

    // Simplified Jira Fetcher: Trust the caller to provide correct Method/Body.
    // Handling of deprecated GET /search is now responsibility of caller (e.g. sync.ts).
    const url = `${domain}/rest/api/3${endpoint}`;

    // ... basic auth ...
    const auth = Buffer.from(`${email}:${token}`).toString("base64");

    const headers = {
        "Authorization": `Basic ${auth}`,
        "Accept": "application/json",
        "Content-Type": "application/json",
        ...options.headers,
    };

    const response = await fetch(url, {
        ...options,
        headers,
        cache: 'no-store' // Critical: Prevent Next.js from caching Jira API responses
    });

    // ...


    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Jira API Error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    return response.json();
}
