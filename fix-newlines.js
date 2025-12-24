const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app', 'actions', 'sync.ts');
let content = fs.readFileSync(filePath, 'utf-8');

// Count occurrences before
const beforeCount = (content.match(/\\\\\\\\n/g) || []).length;
console.log(`Found ${beforeCount} occurrences of \\\\\\\\n`);

// Replace all \\\\n with \\n
content = content.replace(/\\\\\\\\n/g, '\\n');

// Count after
const afterCount = (content.match(/\\\\\\\\n/g) || []).length;
console.log(`After replacement: ${afterCount} occurrences remaining`);

fs.writeFileSync(filePath, content, 'utf-8');

console.log('✅ Fixed escaped newlines in sync.ts');
