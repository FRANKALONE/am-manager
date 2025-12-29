import { syncAllWorkPackages } from './app/actions/cron';

async function runTest() {
    console.log('Starting full sync test...');
    const start = Date.now();
    const result = await syncAllWorkPackages();
    const duration = (Date.now() - start) / 1000;

    console.log('Sync result:', JSON.stringify(result, null, 2));
    console.log(`Total duration: ${duration.toFixed(2)} seconds`);
    process.exit(0);
}

runTest().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
