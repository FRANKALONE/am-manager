const { syncWorkPackage } = require('./app/actions/sync');

async function main() {
    console.log('Starting manual sync for Fuertehoteles WP...');
    console.log('WP ID: AMA30313MANT0001.1.2');
    console.log('Tempo Accounts that will be searched:');
    console.log('  - AMA30313MANT0001.1.2 (WP ID itself)');
    console.log('  - CSE30313MANT0001.1.2 (CSE variant)');
    console.log('  - AMA30313MANT0001.1.1 (tempoAccountId)');
    console.log('  - CSE30313MANT0001.1.1 (oldWpId)');
    console.log('');

    const result = await syncWorkPackage('AMA30313MANT0001.1.2', true);
    console.log('\nSync result:', JSON.stringify(result, null, 2));
}

main().catch(e => {
    console.error('Error:', e);
    process.exit(1);
});
