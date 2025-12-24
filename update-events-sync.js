const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app', 'actions', 'sync.ts');
let content = fs.readFileSync(filePath, 'utf-8');

// Find the Events section and replace it completely
const startMarker = '// 8.5. For Events WP: Fetch ALL tickets from project';
const endMarker = '        }';

// Find start position
const startPos = content.indexOf(startMarker);
if (startPos === -1) {
    console.log('❌ Could not find Events section start marker');
    process.exit(1);
}

// Find the closing braces - we need to find the right one
// Count opening and closing braces to find the matching close
let braceCount = 0;
let inEventsSection = false;
let endPos = -1;

for (let i = startPos; i < content.length; i++) {
    if (content[i] === '{') {
        braceCount++;
        inEventsSection = true;
    } else if (content[i] === '}') {
        braceCount--;
        if (inEventsSection && braceCount === 0) {
            endPos = i + 1;
            break;
        }
    }
}

if (endPos === -1) {
    console.log('❌ Could not find Events section end');
    process.exit(1);
}

const newEventsCode = `// 8.5. For Events WP: Fetch ALL tickets from project using JIRA API v3
        if (wp.contractType?.toUpperCase() === 'EVENTOS') {
            fs.appendFileSync(logPath, \`[INFO] Fetching all tickets for Events WP...\\\\n\`);
            
            const jiraUrl = process.env.JIRA_URL?.trim();
            const jiraEmail = process.env.JIRA_USER_EMAIL?.trim();
            const jiraToken = process.env.JIRA_API_TOKEN?.trim();
            
            if (!jiraUrl || !jiraEmail || !jiraToken) {
                fs.appendFileSync(logPath, \`[ERROR] Missing JIRA credentials for Events sync\\\\n\`);
            } else {
                const projectKeys = wp.jiraProjectKeys?.split(',').map(k => k.trim()).join(', ') || '';
                if (projectKeys) {
                    // Clear old tickets for this WP
                    await prisma.ticket.deleteMany({
                        where: { workPackageId: wp.id }
                    });
                    
                    // Get all tickets from the validity periods
                    const validityPeriods = await prisma.validityPeriod.findMany({
                        where: { workPackageId: wp.id },
                        orderBy: { startDate: 'asc' }
                    });

                    for (const period of validityPeriods) {
                        const startDateStr = period.startDate.toISOString().split('T')[0];
                        const endDateStr = period.endDate.toISOString().split('T')[0];
                        
                        const jql = \`project in (\${projectKeys}) AND created >= "\${startDateStr}" AND created <= "\${endDateStr}" AND issuetype in ("Incidencia", "Correctivo", "Consulta", "Solicitud de Servicio")\`;
                        
                        fs.appendFileSync(logPath, \`[INFO] Fetching tickets for period \${startDateStr} to \${endDateStr}...\\\\n\`);
                        
                        // Fetch with pagination using nextPageToken
                        let nextPageToken: string | null = null;
                        const maxResults = 100;
                        let totalFetched = 0;
                        
                        do {
                            const searchUrl = new URL(\`\${jiraUrl}/rest/api/3/search/jql\`);
                            searchUrl.searchParams.append('jql', jql);
                            searchUrl.searchParams.append('maxResults', maxResults.toString());
                            searchUrl.searchParams.append('fields', 'key,summary,issuetype,created');
                            if (nextPageToken) {
                                searchUrl.searchParams.append('nextPageToken', nextPageToken);
                            }
                            
                            const jiraRes: any = await new Promise((resolve, reject) => {
                                const req = https.request({
                                    hostname: new URL(jiraUrl).hostname,
                                    port: 443,
                                    path: searchUrl.pathname + searchUrl.search,
                                    method: 'GET',
                                    headers: {
                                        'Authorization': \`Basic \${Buffer.from(\`\${jiraEmail}:\${jiraToken}\`).toString('base64')}\`,
                                        'Accept': 'application/json'
                                    }
                                }, (res: any) => {
                                    let data = '';
                                    res.on('data', (chunk: any) => data += chunk);
                                    res.on('end', () => {
                                        try {
                                            resolve(JSON.parse(data));
                                        } catch (e) {
                                            fs.appendFileSync(logPath, \`[ERROR] Failed to parse JIRA response\\\\n\`);
                                            resolve({ issues: [] });
                                        }
                                    });
                                });
                                req.on('error', (err: any) => {
                                    fs.appendFileSync(logPath, \`[ERROR] JIRA request failed: \${err.message}\\\\n\`);
                                    resolve({ issues: [] });
                                });
                                req.end();
                            });
                            
                            if (jiraRes.errorMessages) {
                                fs.appendFileSync(logPath, \`[ERROR] JIRA returned errors: \${JSON.stringify(jiraRes.errorMessages)}\\\\n\`);
                                break;
                            }
                            
                            if (jiraRes.issues && jiraRes.issues.length > 0) {
                                totalFetched += jiraRes.issues.length;
                                fs.appendFileSync(logPath, \`[INFO] Fetched \${jiraRes.issues.length} tickets (total: \${totalFetched})\\\\n\`);
                                
                                // Save tickets to database
                                for (const issue of jiraRes.issues) {
                                    const createdDate = new Date(issue.fields.created);
                                    const year = createdDate.getFullYear();
                                    const month = createdDate.getMonth() + 1;
                                    
                                    await prisma.ticket.create({
                                        data: {
                                            workPackageId: wp.id,
                                            issueKey: issue.key,
                                            issueSummary: issue.fields.summary || '',
                                            issueType: issue.fields.issuetype?.name || 'Unknown',
                                            createdDate: createdDate,
                                            year: year,
                                            month: month
                                        }
                                    });
                                }
                                
                                nextPageToken = jiraRes.nextPageToken || null;
                            } else {
                                nextPageToken = null;
                            }
                            
                        } while (nextPageToken);
                        
                        fs.appendFileSync(logPath, \`[INFO] Total tickets saved for period: \${totalFetched}\\\\n\`);
                    }
                }
            }
        }`;

// Replace the section
content = content.substring(0, startPos) + newEventsCode + content.substring(endPos);

fs.writeFileSync(filePath, content, 'utf-8');

console.log('✅ Updated Events sync section with API v3');
