const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app', 'actions', 'sync.ts');
let content = fs.readFileSync(filePath, 'utf-8');

// Fix the indentation - Events section should be indented with 8 spaces
// Currently it starts at line 547 with no indentation

// Find the Events section
const eventsStart = content.indexOf('// 8.5. For Events WP: Fetch ALL tickets');
if (eventsStart === -1) {
    console.log('❌ Could not find Events section');
    process.exit(1);
}

// Find the end of Events section (before "// 9. Clear old metrics")
const eventsEnd = content.indexOf('// 9. Clear old metrics', eventsStart);
if (eventsEnd === -1) {
    console.log('❌ Could not find end of Events section');
    process.exit(1);
}

// Extract the Events section
const before = content.substring(0, eventsStart);
const eventsSection = content.substring(eventsStart, eventsEnd);
const after = content.substring(eventsEnd);

// Add proper indentation (8 spaces) to each line of Events section
const indentedEvents = eventsSection
    .split('\n')
    .map(line => {
        if (line.trim() === '') return line; // Keep empty lines as is
        return '        ' + line; // Add 8 spaces
    })
    .join('\n');

// Also fix the \\\\n to \\n
const fixedEvents = indentedEvents.replace(/\\\\\\\\n/g, '\\n');

// Reconstruct the file
content = before + fixedEvents + after;

fs.writeFileSync(filePath, content, 'utf-8');

console.log('✅ Fixed indentation and escaped newlines in Events section');
