const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app', 'actions', 'dashboard.ts');
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

// Remove lines 280-308 (index 279-307)
const newLines = [
    ...lines.slice(0, 279),
    ...lines.slice(308)
];

const newContent = newLines.join('\n');
fs.writeFileSync(filePath, newContent, 'utf-8');

console.log('✅ Removed lines 280-308');
console.log('Total lines before:', lines.length);
console.log('Total lines after:', newLines.length);
