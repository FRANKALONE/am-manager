// Script para verificar si clientJiraId está siendo guardado en la BD
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkClientJiraIds() {
    console.log('🔍 Verificando clientJiraId en tickets...\n');

    // Buscar tickets de proyectos FAI, MOL, UAX
    const clients = ['FAI', 'MOL', 'UAX'];

    for (const prefix of clients) {
        console.log(`\n📋 Tickets de proyecto ${prefix}:`);
        console.log('='.repeat(80));

        const tickets = await prisma.ticket.findMany({
            where: {
                issueKey: {
                    startsWith: `${prefix}-`
                }
            },
            select: {
                issueKey: true,
                clientJiraId: true,
                issueSummary: true,
                workPackage: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            take: 10,
            orderBy: {
                createdDate: 'desc'
            }
        });

        if (tickets.length === 0) {
            console.log(`   ❌ No se encontraron tickets de ${prefix}`);
        } else {
            tickets.forEach(t => {
                console.log(`   Ticket: ${t.issueKey}`);
                console.log(`   clientJiraId: ${t.clientJiraId || '❌ NULL/VACÍO'}`);
                console.log(`   WP: ${t.workPackage.id} - ${t.workPackage.name}`);
                console.log(`   Summary: ${t.issueSummary.substring(0, 60)}...`);
                console.log('   ' + '-'.repeat(76));
            });
        }
    }

    // También buscar cualquier ticket que tenga clientJiraId
    console.log('\n\n🎯 Tickets CON clientJiraId (cualquier proyecto):');
    console.log('='.repeat(80));

    const withClientId = await prisma.ticket.findMany({
        where: {
            clientJiraId: {
                not: null
            }
        },
        select: {
            issueKey: true,
            clientJiraId: true,
            issueSummary: true
        },
        take: 20
    });

    if (withClientId.length === 0) {
        console.log('   ❌ NO HAY NINGÚN TICKET CON clientJiraId EN LA BASE DE DATOS');
        console.log('   Esto significa que la sincronización NO está capturando los custom fields');
    } else {
        console.log(`   ✅ Se encontraron ${withClientId.length} tickets con clientJiraId:`);
        withClientId.forEach(t => {
            console.log(`   ${t.clientJiraId} (Altim: ${t.issueKey})`);
        });
    }

    await prisma.$disconnect();
}

checkClientJiraIds().catch(console.error);
