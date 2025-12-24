const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app', 'actions', 'sync.ts');
let content = fs.readFileSync(filePath, 'utf-8');

// The problem: lines 666-712 have wrong indentation (0 spaces instead of 8)
// They should be inside the syncWorkPackage function

// Find line 666 (// 9. Clear old metrics)
const lines = content.split('\n');

// Find the index of "// 9. Clear old metrics"
let startIndex = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '// 9. Clear old metrics and worklog details') {
        startIndex = i;
        console.log(`Found "// 9. Clear old metrics" at line ${i + 1}`);
        break;
    }
}

if (startIndex === -1) {
    console.log('❌ Could not find "// 9. Clear old metrics"');
    process.exit(1);
}

// Find the end of the function (the closing brace before the last closing brace)
// The function should end with "} catch (error: any) {"
let endIndex = -1;
for (let i = startIndex; i < lines.length; i++) {
    if (lines[i].trim().startsWith('} catch (error: any) {')) {
        endIndex = i;
        console.log(`Found end of try block at line ${i + 1}`);
        break;
    }
}

if (endIndex === -1) {
    console.log('❌ Could not find end of try block');
    process.exit(1);
}

// Add 8 spaces to all lines between startIndex and endIndex
for (let i = startIndex; i < endIndex; i++) {
    if (lines[i].trim() === '') continue; // Skip empty lines
    // Check current indentation
    const currentIndent = lines[i].match(/^(\s*)/)[1].length;
    if (currentIndent < 8) {
        // Add 8 spaces
        lines[i] = '        ' + lines[i];
    }
}

content = lines.join('\n');

// Also fix the \\\\n in line 660
content = content.replace(/\\\\\\\\n/g, '\\n');

fs.writeFileSync(filePath, content, 'utf-8');

console.log('✅ Fixed indentation for lines after Events section');
