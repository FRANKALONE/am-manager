
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Correction Models...');

    // Default Config: Adjusted Rounding
    // Rules:
    // <= 0.5 -> 0 (+0)
    // <= 3.5 -> +0.25
    // <= 5.0 -> +0.50
    // <= 7.5 -> +1.0
    // <= 8.5 -> =8.5 (Special case 'FIXED_VALUE')
    // > 8.5 -> +0 (As reported)

    // JSON Structure:
    // type: "TIERED"
    // tiers: [ { max: 0.5, type: "ADD", value: 0 }, { max: 3.5, type: "ADD", value: 0.25 }, ... ]

    const defaultConfig = {
        type: "TIERED",
        tiers: [
            { max: 0.5, type: "ADD", value: 0 },         // <= 0.5 => tr
            { max: 3.5, type: "ADD", value: 0.25 },      // <= 3.5 => tr + 0.25
            { max: 5.0, type: "ADD", value: 0.5 },       // <= 5.0 => tr + 0.50
            { max: 7.5, type: "ADD", value: 1.0 },       // <= 7.5 => tr + 1.00
            { max: 8.5, type: "FIXED", value: 8.5 },     // <= 8.5 => 8.5
            { max: 999, type: "ADD", value: 0 }          // > 8.5 => tr
        ]
    };

    const defaultModel = await prisma.correctionModel.upsert({
        where: { code: 'DEFAULT_TIERED' },
        update: {
            config: JSON.stringify(defaultConfig)
        },
        create: {
            name: 'Redondeo Estándar (Default)',
            code: 'DEFAULT_TIERED',
            description: 'Criterios de redondeo escalonado en función de las horas reportadas.',
            isDefault: true,
            config: JSON.stringify(defaultConfig),
            status: 'active'
        },
    });

    console.log('Default Model Upserted:', defaultModel.name);

    // Example placeholder for the Rate Diff model mentioned
    const rateDiffConfig = {
        type: "RATE_DIFF",
        referenceRate: 65.0
    };

    const rateDiffModel = await prisma.correctionModel.upsert({
        where: { code: 'RATE_DIFF_65' },
        update: {},
        create: {
            name: 'Diferencia de Tarifa (Media 65€)',
            code: 'RATE_DIFF_65',
            description: 'Ajuste basado en diferencia de tarifa vs 65€/h.',
            isDefault: false,
            config: JSON.stringify(rateDiffConfig),
            status: 'active'
        },
    });
    console.log('Rate Diff Model Upserted:', rateDiffModel.name);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
