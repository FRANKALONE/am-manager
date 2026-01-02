const { getTicketConsumptionReport } = require('./app/actions/dashboard');

async function test() {
    // AMA00253MANT0001.1.1 is the WP in the screenshot
    const wpId = 'AMA00253MANT0001.1.1';

    // We need to find the validity period ID if any, or it will use the current one.
    // Let's just pass the wpId.
    const result = await getTicketConsumptionReport(wpId);

    if (result && result.tickets) {
        const aie438 = result.tickets.find(t => t.issueKey === 'AIE-438');
        console.log('Ticket AIE-438 details:');
        console.log(JSON.stringify(aie438, null, 2));
    } else {
        console.log('No tickets found or error');
    }
}

test().catch(console.error);
