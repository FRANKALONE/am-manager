const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app', 'actions', 'dashboard.ts');
let content = fs.readFileSync(filePath, 'utf-8');

// Find and replace the ticket counting logic - fix the forEach to properly add to Set
const oldPattern = /\/\/ Count tickets created in this month from synced worklogDetails[\s\S]*?const ticketsInMonth = uniqueTickets\.size;/;

const newCode = `// Count tickets created in this month from synced worklogDetails
                // This includes ALL tickets (with and without worklogs) synced during sync
                const uniqueTickets = new Set<string>();
                wp.worklogDetails.forEach(wl => {
                    if (!wl.issueCreatedDate) return;
                    const createdDate = new Date(wl.issueCreatedDate);
                    const createdMonth = createdDate.getMonth() + 1;
                    const createdYear = createdDate.getFullYear();
                    if (createdMonth === m && createdYear === y) {
                        const issueType = wl.issueType?.toUpperCase() || '';
                        if (issueType.includes('INCIDENCIA') ||
                            issueType.includes('CORRECTIVO') ||
                            issueType === 'CONSULTA' ||
                            issueType.includes('SOLICITUD')) {
                            uniqueTickets.add(wl.issueKey || '');
                        }
                    }
                });
                const ticketsInMonth = uniqueTickets.size;`;

content = content.replace(oldPattern, newCode);

fs.writeFileSync(filePath, content, 'utf-8');

console.log('✅ Fixed Events ticket counting logic');
