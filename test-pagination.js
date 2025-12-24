const https = require('https');
const fs = require('fs');

const envPath = require('path').join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
        env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
    }
});

const jiraUrl = env.JIRA_URL?.trim();
const jiraEmail = env.JIRA_USER_EMAIL?.trim();
const jiraToken = env.JIRA_API_TOKEN?.trim();

async function fetchWithNextPageToken() {
    const projectKeys = 'IMP';
    const startDateStr = '2024-04-01';
    const endDateStr = '2025-03-31';
    const jql = `project in (${projectKeys}) AND created >= "${startDateStr}" AND created <= "${endDateStr}" AND issuetype in ("Incidencia", "Correctivo", "Consulta", "Solicitud de Servicio")`;

    let nextPageToken = null;
    const maxResults = 50;
    let allIssues = [];
    let pageCount = 0;

    console.log('Fetching tickets with nextPageToken pagination...\n');

    do {
        const searchUrl = new URL(`${jiraUrl}/rest/api/3/search/jql`);
        searchUrl.searchParams.append('jql', jql);
        searchUrl.searchParams.append('maxResults', maxResults.toString());
        searchUrl.searchParams.append('fields', 'key,summary,issuetype,created');
        if (nextPageToken) {
            searchUrl.searchParams.append('nextPageToken', nextPageToken);
        }

        const result = await new Promise((resolve) => {
            const req = https.request({
                hostname: searchUrl.hostname,
                port: 443,
                path: searchUrl.pathname + searchUrl.search,
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64')}`,
                    'Accept': 'application/json'
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        console.log('Parse error:', data.substring(0, 200));
                        resolve({ issues: [] });
                    }
                });
            });
            req.on('error', (err) => {
                console.log('Request error:', err);
                resolve({ issues: [] });
            });
            req.end();
        });

        pageCount++;
        console.log(`Page ${pageCount}: Status ${result.errorMessages ? 'ERROR' : 'OK'}`);

        if (result.errorMessages) {
            console.log('Errors:', result.errorMessages);
            break;
        }

        if (result.issues && result.issues.length > 0) {
            allIssues = allIssues.concat(result.issues);
            console.log(`  Fetched ${result.issues.length} issues (total so far: ${allIssues.length})`);
            nextPageToken = result.nextPageToken || null;
        } else {
            nextPageToken = null;
        }

    } while (nextPageToken);

    console.log(`\n✅ Total tickets fetched: ${allIssues.length} in ${pageCount} pages`);
    if (allIssues.length > 0) {
        console.log('\nFirst 3 tickets:');
        allIssues.slice(0, 3).forEach(issue => {
            console.log(`  - ${issue.key}: ${issue.fields.issuetype?.name} (${issue.fields.created})`);
        });
    }
}

fetchWithNextPageToken().catch(console.error);
