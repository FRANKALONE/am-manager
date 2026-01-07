// Script para generar hash de contraseña para usuario demo
const bcrypt = require('bcryptjs');

const password = 'Demo2025!';

bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
        console.error('Error:', err);
        return;
    }
    console.log('\n==============================================');
    console.log('Password Hash Generado');
    console.log('==============================================\n');
    console.log('Password:', password);
    console.log('Hash:', hash);
    console.log('\n==============================================');
    console.log('Copia este hash en el script SQL:');
    console.log('==============================================\n');
    console.log(hash);
    console.log('\n');
});
