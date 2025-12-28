const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateWpConfig() {
    console.log('=== Iniciando Migración de Configuración de WP ===');

    const baseTypes = "BPO, Consulta, Incidencia de Correctivo, Solicitud de servicio, Soporte AM";

    // Obtener todos los WPs
    const wps = await prisma.workPackage.findMany();
    console.log(`Encontrados ${wps.length} Work Packages.`);

    for (const wp of wps) {
        let wpTypes = baseTypes;
        if (wp.hasIaasService) {
            wpTypes += ", Servicio IAAS";
        }

        await prisma.workPackage.update({
            where: { id: wp.id },
            data: {
                includedTicketTypes: wpTypes,
                includeEvoEstimates: true,
                includeEvoTM: true
            }
        });
        console.log(`Actualizado WP: ${wp.name} (${wp.id}) con tipos: ${wpTypes}`);
    }

    console.log('=== Migración completada con éxito ===');
}

migrateWpConfig()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
