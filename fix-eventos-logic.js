const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app', 'actions', 'dashboard.ts');
let content = fs.readFileSync(filePath, 'utf-8');

// Find and replace the ticket counting logic
const oldCode = `                // Count tickets created in this month (by creation date, not worklog date)
                // Types: Incidencia Correctivo, Consulta, Solicitud de Servicio
                const ticketsInMonth = wp.worklogDetails.filter(wl => {
                    if (!wl.issueCreatedDate) return false;
                    const createdDate = new Date(wl.issueCreatedDate);
                    const createdMonth = createdDate.getMonth() + 1;
                    const createdYear = createdDate.getFullYear();
                    if (createdMonth !== m || createdYear !== y) return false;
                    
                    const issueType = wl.issueType?.toUpperCase() || '';
                    return issueType.includes('INCIDENCIA') ||
                        issueType.includes('CORRECTIVO') ||
                        issueType === 'CONSULTA' ||
                        issueType.includes('SOLICITUD');
                }).length;`;

const newCode = `                // Count tickets created in this month from JIRA API
                // This gets ALL tickets created, not just those with worklogs
                const ticketsInMonth = await getTicketCountFromJira(wp.jiraProjectKeys || '', m, y);`;

content = content.replace(oldCode, newCode);

fs.writeFileSync(filePath, content, 'utf-8');

console.log('✅ Updated ticket counting logic to use JIRA API');
