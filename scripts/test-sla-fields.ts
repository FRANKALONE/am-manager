// Script para verificar los campos SLA de Jira
import { fetchJira } from '@/lib/jira';

async function testSLAFields() {
    try {
        // Buscar algunos tickets de 2025
        const jql = 'created >= "2025-01-01" AND created <= "2025-01-31" AND issuetype IN ("Incidencia de Correctivo", "Consulta")';
        const endpoint = `/search/jql?jql=${encodeURIComponent(jql)}&maxResults=5&fields=key,summary,issuetype,customfield_10006,customfield_10007,customfield_10008,customfield_10009`;

        console.log('Consultando Jira...');
        const res = await fetchJira(endpoint);

        console.log(`\nTotal de tickets encontrados: ${res.total}`);
        console.log(`\nMostrando ${res.issues?.length || 0} tickets:\n`);

        res.issues?.forEach((issue: any, idx: number) => {
            console.log(`\n--- Ticket ${idx + 1}: ${issue.key} ---`);
            console.log(`Summary: ${issue.fields.summary}`);
            console.log(`Type: ${issue.fields.issuetype?.name}`);
            console.log(`\nCampos SLA:`);
            console.log(`  customfield_10006 (SLA Resolution):`, JSON.stringify(issue.fields.customfield_10006, null, 2));
            console.log(`  customfield_10007 (SLA Response):`, JSON.stringify(issue.fields.customfield_10007, null, 2));
            console.log(`  customfield_10008 (SLA Resolution Time):`, JSON.stringify(issue.fields.customfield_10008, null, 2));
            console.log(`  customfield_10009 (SLA Response Time):`, JSON.stringify(issue.fields.customfield_10009, null, 2));
        });

    } catch (error) {
        console.error('Error:', error);
    }
}

testSLAFields();
