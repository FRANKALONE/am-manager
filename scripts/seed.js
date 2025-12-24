const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PARAMETERS = [
    // Contract Types
    { category: 'CONTRACT_TYPE', label: 'Bajo Demanda', value: 'BAJO_DEMANDA', order: 1 },
    { category: 'CONTRACT_TYPE', label: 'Bolsa de Horas Mensual', value: 'BOLSA_MENSUAL', order: 2 },
    { category: 'CONTRACT_TYPE', label: 'Bolsa de Horas Puntual', value: 'BOLSA_PUNTUAL', order: 3 },
    { category: 'CONTRACT_TYPE', label: 'Eventos', value: 'EVENTOS', order: 4 },
    { category: 'CONTRACT_TYPE', label: 'Servicio Puntual', value: 'SERVICIO_PUNTUAL', order: 5 },

    // Scope Units
    { category: 'SCOPE_UNIT', label: 'Horas', value: 'HORAS', order: 1 },
    { category: 'SCOPE_UNIT', label: 'Unidades', value: 'UNIDADES', order: 2 },
    { category: 'SCOPE_UNIT', label: 'Eventos', value: 'EVENTOS', order: 3 },

    // Billing Types
    { category: 'BILLING_TYPE', label: 'Mensual', value: 'MENSUAL', order: 1 },
    { category: 'BILLING_TYPE', label: 'Trimestral', value: 'TRIMESTRAL', order: 2 },
    { category: 'BILLING_TYPE', label: 'Semestral', value: 'SEMESTRAL', order: 3 },
    { category: 'BILLING_TYPE', label: 'Anual', value: 'ANUAL', order: 4 },
    { category: 'BILLING_TYPE', label: 'Puntual', value: 'PUNTUAL', order: 5 },

    // Renewal Types
    { category: 'RENEWAL_TYPE', label: 'Automática', value: 'AUTO', order: 1 },
    { category: 'RENEWAL_TYPE', label: 'Bajo Pedido', value: 'BAJO_PEDIDO', order: 2 },

    // Managers (Initial placeholder)
    { category: 'MANAGER', label: 'Gerente Principal', value: 'GERENTE_MAIN', order: 1 },
];

async function main() {
    console.log('Start seeding parameters...');

    for (const param of PARAMETERS) {
        const exists = await prisma.parameter.findFirst({
            where: {
                category: param.category,
                value: param.value
            }
        });

        if (!exists) {
            await prisma.parameter.create({
                data: param
            });
            console.log(`Created parameter: ${param.category} - ${param.label}`);
        } else {
            console.log(`Parameter already exists: ${param.category} - ${param.label}`);
        }
    }

    console.log('Seeding finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
