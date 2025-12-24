const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app', 'actions', 'sync.ts');
const lines = fs.readFileSync(filePath, 'utf-8').split('\n');

console.log(`Original file has ${lines.length} lines`);

// The duplication starts around line 544 and goes to around line 750
// We need to remove lines 544-750 which are duplicates of earlier code
// The Events section should start around line 751

// Find where the Events section starts (after the duplication)
let eventsStartIndex = -1;
for (let i = 700; i < lines.length; i++) {
    if (lines[i].includes('8.5. For Events WP: Fetch ALL tickets')) {
        eventsStartIndex = i;
        console.log(`Found Events section at line ${i + 1}`);
        break;
    }
}

if (eventsStartIndex === -1) {
    console.log('❌ Could not find Events section');
    process.exit(1);
}

// Find where the original regularization processing ends (before duplication)
let regEndIndex = -1;
for (let i = 500; i < 600; i++) {
    if (lines[i].includes('DON\'T add to worklog details - regularizations are calculated separately')) {
        regEndIndex = i;
        console.log(`Found end of regularizations at line ${i + 1}`);
        break;
    }
}

if (regEndIndex === -1) {
    console.log('❌ Could not find end of regularizations');
    process.exit(1);
}

// Remove duplicated lines between regEndIndex+1 and eventsStartIndex-1
const cleanedLines = [
    ...lines.slice(0, regEndIndex + 1),
    '',
    ...lines.slice(eventsStartIndex)
];

console.log(`Cleaned file will have ${cleanedLines.length} lines`);
console.log(`Removed ${lines.length - cleanedLines.length} duplicate lines`);

fs.writeFileSync(filePath, cleanedLines.join('\n'), 'utf-8');

console.log('✅ File cleaned successfully');
