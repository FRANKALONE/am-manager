const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app', 'actions', 'dashboard.ts');
let content = fs.readFileSync(filePath, 'utf-8');

// Replace ticketType with issueType
content = content.replace(/ticketType\.includes\('INCIDENCIA'\)/g, "issueType.includes('INCIDENCIA')");
content = content.replace(/ticketType\.includes\('CORRECTIVO'\)/g, "issueType.includes('CORRECTIVO')");
content = content.replace(/ticketType === 'CONSULTA'/g, "issueType === 'CONSULTA'");
content = content.replace(/ticketType\.includes\('SOLICITUD'\)/g, "issueType.includes('SOLICITUD')");

fs.writeFileSync(filePath, content, 'utf-8');

console.log('✅ Fixed ticketType references to issueType');
