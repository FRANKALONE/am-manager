const { execSync } = require('child_process');

try {
    console.log('Installing @radix-ui/react-alert-dialog...');
    execSync('npm install @radix-ui/react-alert-dialog', {
        stdio: 'inherit',
        shell: 'cmd.exe'
    });
    console.log('✅ Installation complete!');
} catch (error) {
    console.error('❌ Installation failed:', error.message);
    process.exit(1);
}
