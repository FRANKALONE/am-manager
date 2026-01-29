import * as dotenv from 'dotenv';
import path from 'path';
import { searchJiraIssues, EVOLUTIVO_TYPES } from './lib/ama-evolutivos/jira';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

async function debugCounts() {
    console.log('=== JIRA COUNT DEBUG ===\n');

    const evoTypesStr = EVOLUTIVO_TYPES.map(t => `"${t}"`).join(', ');

    // Requested queries
    const queries = [
        {
            name: 'Incidencias (Requested)',
            jql: 'projectType = "service_desk" AND issuetype IN ("Incidencia de Correctivo", "Consulta", "Consultas") AND status NOT IN ("Cerrado", "Propuesta de Solución")'
        },
        {
            name: 'Evolutivos (Requested)',
            jql: `projectType = "service_desk" AND issuetype IN (${evoTypesStr}) AND status NOT IN ("Cerrado", "Entregado en PRO")`
        },
        {
            name: 'Incidencias (Current)',
            jql: 'projectType = "service_desk" AND issuetype IN ("Incidencia de Correctivo", "Consulta") AND status NOT IN ("Cerrado", "Propuesta de Solución", "Done")'
        },
        {
            name: 'Evolutivos (Current)',
            jql: `projectType = "service_desk" AND issuetype IN (${evoTypesStr}) AND status NOT IN ("Cerrado", "Done", "Entregado en PRO", "Entregado en PRO (Cloud)", "Entregado en PRD")`
        }
    ];

    for (const q of queries) {
        console.log(`\nTesting Query: ${q.name}`);
        console.log(`JQL: ${q.jql}`);
        try {
            const issues = await searchJiraIssues(q.jql, ['id']);
            console.log(`Result: ${issues.length} issues found.`);
        } catch (error: any) {
            console.error(`Error: ${error.message}`);
        }
    }
}

debugCounts();
