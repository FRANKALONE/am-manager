const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app', 'actions', 'dashboard.ts');
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

console.log('Lines 280-309:');
for (let i = 279; i < 309; i++) {
    console.log(`${i + 1}: ${lines[i]}`);
}
