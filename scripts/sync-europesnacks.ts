import { syncWorkPackage } from '../app/actions/sync';

async function syncEuropesnacks() {
    console.log('Starting sync for Europesnacks Work Packages...\n');

    const wpIds = [
        'AMA00081MANT0001.1.2',
        'CSE00081MANT0001.1.1'
    ];

    for (const wpId of wpIds) {
        console.log(`\n========================================`);
        console.log(`Syncing: ${wpId}`);
        console.log(`========================================`);

        try {
            const result = await syncWorkPackage(wpId);

            if (result.error) {
                console.error(`❌ Error syncing ${wpId}:`, result.error);
            } else if (result.success) {
                console.log(`✓ Successfully synced ${wpId}`);
                if (result.totalHours !== undefined) {
                    console.log(`  Total hours: ${result.totalHours.toFixed(2)}h`);
                }
            }
        } catch (error: any) {
            console.error(`❌ Exception syncing ${wpId}:`, error?.message || String(error));
        }
    }

    console.log('\n========================================');
    console.log('Sync completed for all Europesnacks WPs');
    console.log('========================================');
    console.log('\nCheck sync-debug.log for detailed information');
}

syncEuropesnacks();
