const fs = require('fs');
const path = require('path');

function getEnvVar(name) {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        const match = content.match(new RegExp(`${name}=["']?([^"'\\n]+)["']?`));
        return match ? match[1] : null;
    }
    return null;
}

async function fetchJira(endpoint) {
    const token = getEnvVar('JIRA_API_TOKEN')?.trim();
    const email = getEnvVar('JIRA_USER_EMAIL')?.trim();
    const domain = getEnvVar('JIRA_URL')?.trim();

    if (!token || !email || !domain) {
        throw new Error("JIRA_API_TOKEN, JIRA_USER_EMAIL or JIRA_URL is not defined");
    }

    const url = `${domain}/rest/api/3${endpoint}`;
    const auth = Buffer.from(`${email}:${token}`).toString("base64");

    const headers = {
        "Authorization": `Basic ${auth}`,
        "Accept": "application/json",
        "Content-Type": "application/json"
    };

    console.log(`Fetching: ${url}`);
    const response = await fetch(url, { headers });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Jira API Error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    return response.json();
}

async function main() {
    try {
        const incidentTypes = ['Consulta', 'Evolutivo', 'Formación', 'Garantía', 'Incidencia de Correctivo',
            'Interno', 'Petición de Evolutivo', 'Servicio IAAS', 'Solicitud de servicio', 'Soporte AM'];

        const jql2024 = `created >= "2024-01-01" AND created <= "2024-12-31" AND type IN (${incidentTypes.map(t => `"${t}"`).join(', ')})`;

        console.log('JQL Query:', jql2024);
        console.log('Encoded:', encodeURIComponent(jql2024));

        const result = await fetchJira(`/search?jql=${encodeURIComponent(jql2024)}&maxResults=0`);

        console.log('\n=== SUCCESS ===');
        console.log('Total incidents in 2024:', result.total);

    } catch (err) {
        console.error('\n=== ERROR ===');
        console.error(err.message);
    }
}

main();
