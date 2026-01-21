const { getAmManagementReport } = require('./app/actions/analytics-am');

async function test() {
    try {
        const year = 2025;
        console.log(`Testing report for ${year}...`);
        const report = await getAmManagementReport(year);

        console.log('--- REPORT VERIFICATION ---');
        console.log(`Year: ${report.year}`);
        console.log(`Evolutivos Creados: ${report.current.ticketsCount}`);
        console.log(`Entregas en PRO: ${report.current.deliveredCount}`);
        console.log(`Ofertas Solicitadas: ${report.current.proposalsRequested}`);
        console.log(`Ofertas Enviadas: ${report.current.proposalsSent}`);
        console.log(`Ofertas Aprobadas: ${report.current.proposalsApproved}`);
        console.log('---------------------------');

        if (report.current.deliveredCount > 0 || report.current.proposalsSent > 0) {
            console.log('SUCCESS: Data is now flowing into the report!');
        } else {
            console.log('WARNING: Metrics are still zero. Check status mappings again.');
        }
    } catch (err) {
        console.error('Error running report:', err.message);
    }
}

test();
