const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app', 'actions', 'dashboard.ts');
let content = fs.readFileSync(filePath, 'utf-8');

// Replace the ticket counting logic for Events
const oldCode = `                // Count tickets created in this month from synced worklogDetails
                // This includes ALL tickets (with and without worklogs) synced during sync
                const uniqueTickets = new Set<string>();
                wp.worklogDetails.forEach(wl => {
                    if (!wl.issueCreatedDate) return;
                    const createdDate = new Date(wl.issueCreatedDate);
                    const createdMonth = createdDate.getMonth() + 1;
                    const createdYear = createdDate.getFullYear();
                    const issueType = wl.issueType?.toUpperCase() || '';
                    return issueType.includes('INCIDENCIA') ||
                        issueType.includes('CORRECTIVO') ||
                        issueType === 'CONSULTA' ||
                        issueType.includes('SOLICITUD');
                }).length;`;

const newCode = `                // Count tickets created in this month from Ticket table
                // This includes ALL tickets synced from JIRA (with or without worklogs)
                const ticketsInMonth = wp.tickets.filter(t => 
                    t.year === y && t.month === m
                ).length;`;

content = content.replace(oldCode, newCode);

fs.writeFileSync(filePath, content, 'utf-8');

console.log('✅ Updated dashboard to use Ticket table for Events');
