const https = require('https');

// ⚠️ REEMPLAZA ESTE TOKEN CON TU TOKEN REAL DE TEMPO
const tempoToken = '1SNa9fAZY21j8AxIdhC8ovVnHqEMb8-us';

// Obtener worklogs de los últimos 7 días
const today = new Date();
const lastWeek = new Date(today);
lastWeek.setDate(today.getDate() - 7);

const from = lastWeek.toISOString().split('T')[0];
const to = today.toISOString().split('T')[0];

console.log(`\n🔍 Consultando worklogs de Tempo desde ${from} hasta ${to}...\n`);

const url = `https://api.tempo.io/4/worklogs?from=${from}&to=${to}&limit=5`;

https.get(url, {
    headers: {
        'Authorization': `Bearer ${tempoToken}`,
        'Content-Type': 'application/json'
    }
}, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const parsed = JSON.parse(data);

            if (res.statusCode !== 200) {
                console.error(`❌ Error HTTP ${res.statusCode}`);
                console.error(JSON.stringify(parsed, null, 2));
                return;
            }

            console.log('📊 RESPUESTA COMPLETA DE LA API:');
            console.log('='.repeat(80));
            console.log(JSON.stringify(parsed, null, 2));
            console.log('='.repeat(80));

            if (parsed.results && parsed.results.length > 0) {
                console.log(`\n✅ Se encontraron ${parsed.results.length} worklogs\n`);

                // Mostrar el primer worklog con detalle
                console.log('📝 DETALLE DEL PRIMER WORKLOG:');
                console.log('='.repeat(80));
                const firstWorklog = parsed.results[0];

                Object.keys(firstWorklog).forEach(key => {
                    const value = firstWorklog[key];
                    const type = typeof value;
                    const displayValue = type === 'object' ? JSON.stringify(value, null, 2) : value;

                    console.log(`\n${key}:`);
                    console.log(`  Tipo: ${type}`);
                    console.log(`  Valor: ${displayValue}`);
                });
                console.log('='.repeat(80));

                // Mostrar estructura de campos disponibles
                console.log('\n📋 CAMPOS DISPONIBLES EN CADA WORKLOG:');
                console.log('='.repeat(80));
                Object.keys(firstWorklog).forEach(key => {
                    console.log(`- ${key}`);
                });
                console.log('='.repeat(80));

            } else {
                console.log('\n⚠️  No se encontraron worklogs en el período especificado');
                console.log('Respuesta:', JSON.stringify(parsed, null, 2));
            }

            // Información adicional de la respuesta
            if (parsed.metadata) {
                console.log('\n📊 METADATA DE LA RESPUESTA:');
                console.log(JSON.stringify(parsed.metadata, null, 2));
            }

        } catch (error) {
            console.error('\n❌ ERROR al parsear respuesta:', error.message);
            console.error('Datos recibidos:', data);
        }
    });
}).on('error', err => {
    console.error('\n❌ ERROR de red:', err.message);
});
