const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app', 'actions', 'sync.ts');
let content = fs.readFileSync(filePath, 'utf-8');

// Count before
const beforeMatches = content.match(/\\\\n/g);
const beforeCount = beforeMatches ? beforeMatches.length : 0;
console.log(`Found ${beforeCount} occurrences of \\\\n (double backslash + n)`);

// Replace all \\n (double backslash + n) with \n (single backslash + n)
// In JavaScript strings: \\\\ represents \\ in the file, and \\n represents \n
content = content.replace(/\\\\n/g, '\\n');

// Count after
const afterMatches = content.match(/\\\\n/g);
const afterCount = afterMatches ? afterMatches.length : 0;
console.log(`After replacement: ${afterCount} occurrences remaining`);
console.log(`Fixed ${beforeCount - afterCount} occurrences`);

fs.writeFileSync(filePath, content, 'utf-8');

console.log('✅ Fixed all escaped newlines');
