
const fs = require('fs');
const path = require('path');

const filePath = path.join('app', 'actions', 'sync.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Batch 1 Fields (Line 304 area)
content = content.replace(
    /fields:\s*\[('key',\s*'summary',\s*'issuetype',\s*'status',\s*'priority',\s*'customfield_10121',\s*'customfield_10065',\s*'customfield_10064',\s*'created',\s*'components')\]/,
    "fields: [$1, 'reporter']"
);

// 2. Batch 1 Mapping (Line 380 area)
content = content.replace(
    /(slaResolutionTime:\s*resolSla\.time,\s*component:\s*component)(\s*\}\);)/,
    "$1,\n                                reporter: issue.fields.reporter?.displayName || 'Unknown'$2"
);

// 3. Batch 2 Mapping (Line 602 area)
content = content.replace(
    /(slaResolutionTime:\s*resolSla\.time,\s*component:\s*component)(\s*\}\);)/,
    "$1,\n                                reporter: issue.fields.reporter?.displayName || 'Unknown'$2"
);

// 4. Batch 3 Fields (Line 768 area)
content = content.replace(
    /fields:\s*\[('key',\s*'summary',\s*'issuetype',\s*'status',\s*'priority',\s*'customfield_10121',\s*'customfield_10065',\s*'customfield_10064',\s*'created',\s*'components')\]/g,
    "fields: [$1, 'reporter']"
);

// 5. Batch 3 Mapping (Line 844 area)
content = content.replace(
    /(slaResolutionTime:\s*resolSla\.time,\s*component:\s*component)(\s*\}\);)/g,
    "$1,\n                                reporter: issue.fields.reporter?.displayName || 'Unknown'$2"
);

fs.writeFileSync(filePath, content);
console.log('Successfully patched sync.ts with reporter and component mapping.');
