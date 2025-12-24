
const TEMPO_API_BASE = "https://api.tempo.io/4";

export async function fetchTempo(endpoint: string, options: RequestInit = {}) {
    const token = process.env.TEMPO_API_TOKEN;
    if (!token) {
        throw new Error("TEMPO_API_TOKEN is not defined");
    }

    const url = `${TEMPO_API_BASE}${endpoint}`;

    const headers = {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json",
        ...options.headers,
    };

    const response = await fetch(url, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Tempo API Error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    return response.json();
}

export async function getWorklogs(from: string, to: string, projectKey?: string, accountKey?: string, issueIds?: number[]) {
    // Tempo v4 search endpoint or worklogs endpoint
    // Using search for filtering is often better, but let's try strict worklogs access first
    // GET /worklogs/user/{accountId} or /worklogs/search

    // We want project based worklogs. 
    // Usually via /worklogs/search using JQL or basic params if supported.
    // Tempo Cloud v4: POST /worklogs/search is powerful.

    // Let's use POST /worklogs/search
    const limit = 1000;
    const body: any = {
        from,
        to,
        limit, // Keep limit in body too just in case, but query param is key
        offset: 0
    };

    if (projectKey) {
        body.projectKey = [projectKey];
    }

    if (accountKey) {
        // Support array or single string
        body.accountKey = Array.isArray(accountKey) ? accountKey : [accountKey];
    }

    if (issueIds && issueIds.length > 0) {
        body.issueId = issueIds;
    }

    let allResults: any[] = [];
    let hasMore = true;

    while (hasMore) {
        // FIX: limit must be a query parameter for POST search to respect it (defaults to 50 otherwise)
        const response: any = await fetchTempo(`/worklogs/search?limit=${limit}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        const results = response.results || [];
        allResults = [...allResults, ...results];

        if (results.length < limit) {
            hasMore = false;
        } else {
            body.offset += limit;
        }
    }

    return { results: allResults };
}
