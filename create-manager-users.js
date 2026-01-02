const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const managers = [
    { id: 'ae-user', name: 'Antonio', surname: 'Espejo', email: 'antonio.espejo@manageram.com' },
    { id: 'nb-user', name: 'Nines', surname: 'Bueno', email: 'nines.bueno@manageram.com' },
    { id: 'ui-user', name: 'Unai', surname: 'Iparraguirre', email: 'unai.iparraguirre@manageram.com' },
    { id: 'at-user', name: 'Angel', surname: 'Trevejo', email: 'angel.trevejo@manageram.com' },
    { id: 'jat-user', name: 'Juan Antonio', surname: 'Trevejo', email: 'jatrevejo@manageram.com' },
    { id: 'rm-user', name: 'Raquel', surname: 'Malo', email: 'raquel.malo@manageram.com' },
    { id: 'cp-user', name: 'Carlos', surname: 'del Pino', email: 'carlos.delpino@manageram.com' },
    { id: 'ft-user', name: 'Fernando', surname: 'Talavera', email: 'fernando.talavera@manageram.com' },
];

async function createUsers() {
    console.log('--- Creating Manager Users ---');
    const password = await bcrypt.hash('ManagerAM2026!', 10);

    for (const m of managers) {
        try {
            await prisma.user.upsert({
                where: { email: m.email },
                update: {},
                create: {
                    id: m.id,
                    name: m.name,
                    surname: m.surname,
                    email: m.email,
                    password: password,
                    role: 'GERENTE'
                }
            });
            console.log(`[OK] Created/Exists: ${m.name} ${m.surname} (${m.id})`);
        } catch (e) {
            console.error(`[ERROR] Failed to create ${m.name}:`, e.message);
        }
    }
    await prisma.$disconnect();
}

createUsers();
