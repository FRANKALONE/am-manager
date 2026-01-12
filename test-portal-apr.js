const { getPortalUrlByProjectKey } = require('./lib/jira-customers');
require('dotenv').config();

async function testPortal() {
    const projectKey = 'APR';
    console.log(`Testing portal for ${projectKey}...`);
    try {
        const url = await getPortalUrlByProjectKey(projectKey);
        console.log(`Portal URL: ${url}`);
    } catch (e) {
        console.error('Error:', e);
    }
}

testPortal();
