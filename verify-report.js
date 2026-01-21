const { getAmManagementReport } = require('./app/actions/analytics-am');

async function test() {
    try {
        const year = 2025;
        console.log(`Testing refactored report for ${year}...`);
        const report = await getAmManagementReport(year);

        console.log('--- REPORT VERIFICATION ---');
        console.log(`Year: ${report.year}`);
        console.log(`1. Evolutivos Creados: ${report.current.ticketsCount}`);
        console.log(`2. Entregas en PRO: ${report.current.deliveredCount}`);
        console.log(`3. Evolutivo Medio (Jornadas): ${report.current.avgHours.toFixed(2)} j`);
        console.log(`4. Ofertas Solicitadas: ${report.current.proposalsRequested}`);
        console.log(`5. Ofertas Enviadas: ${report.current.proposalsSent}`);
        console.log(`6. Ofertas Aprobadas: ${report.current.proposalsApproved}`);
        console.log(`7. Ratio Envío/Solicitud: ${report.current.sentVsRequestedRatio.toFixed(2)}%`);
        console.log(`Acceptance Ratio: ${report.current.acceptanceRatio.toFixed(2)}%`);

        console.log('\n--- TOP CLIENTS (COUNT) ---');
        report.topClientsCount.forEach((c, i) => console.log(`${i + 1}. ${c.name}: ${c.ticketsCount}`));

        console.log('\n--- TOP CLIENTS (VOLUME) ---');
        report.topClientsVolume.forEach((c, i) => console.log(`${i + 1}. ${c.name}: ${c.volume.toFixed(2)} j`));

        console.log('---------------------------');

        const transcom = report.clients.find(c => c.name.includes("TRANSCOM"));
        if (transcom) {
            console.log('ERROR: TRANSCOM was not excluded!');
        } else {
            console.log('SUCCESS: TRANSCOM excluded.');
        }
    } catch (err) {
        console.error('Error running report:', err.message);
    }
}

test();
