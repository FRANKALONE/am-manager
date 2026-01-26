const { jsPDF } = require("jspdf");
const fs = require("fs");
const path = require("path");

const doc = new jsPDF();
const assetsPath = path.join(__dirname, "..", "public", "manual-assets");
const publicPath = path.join(__dirname, "..", "public");
const outputPath = path.join(publicPath, "manual.pdf");

if (!fs.existsSync(publicPath)) {
    fs.mkdirSync(publicPath, { recursive: true });
}

// Helper to add image if exists
function addImageIfExists(filename, x, y, w, h) {
    const imgPath = path.join(assetsPath, filename);
    if (fs.existsSync(imgPath)) {
        console.log(`Adding image: ${filename}`);
        try {
            const imgData = fs.readFileSync(imgPath);
            const ext = filename.split(".").pop().toUpperCase();
            // jsPDF in Node.js works better with Buffers/Uint8Arrays directly
            doc.addImage(imgData, ext, x, y, w, h, undefined, 'FAST');
            console.log(`Successfully added: ${filename}`);
        } catch (e) {
            console.error(`Error adding image ${filename}:`, e.message);
        }
    } else {
        console.warn(`Image NOT found: ${filename} at ${imgPath}`);
    }
}

// --- COVER PAGE ---
doc.setFontSize(30);
doc.setTextColor(20, 50, 100);
doc.text("Manual de Usuario", 105, 60, { align: "center" });
doc.setFontSize(24);
doc.text("AM Manager", 105, 75, { align: "center" });
doc.setFontSize(14);
doc.setTextColor(100);
doc.text("Gestión de Soporte y Evolutivos", 105, 90, { align: "center" });
doc.text("v1.0 - 2026", 105, 280, { align: "center" });

// --- INDEX ---
doc.addPage();
doc.setFontSize(22);
doc.setTextColor(20, 50, 100);
doc.text("ÍNDICE", 20, 30);
doc.setFontSize(12);
doc.setTextColor(0);
const indexItems = [
    "1. INTRODUCCIÓN",
    "2. PERSONALIZACIÓN DE USUARIO",
    "3. NOTIFICACIONES",
    "4. DASHBOARD DE CONSUMOS",
    "5. GESTIÓN DE EVOLUTIVOS",
    "6. GESTIÓN DE USUARIOS"
];
indexItems.forEach((item, i) => {
    doc.text(item, 25, 50 + (i * 10));
});

// --- INTRODUCCIÓN ---
doc.addPage();
doc.setFontSize(18);
doc.setTextColor(20, 50, 100);
doc.text("1. INTRODUCCIÓN", 20, 20);
doc.setFontSize(11);
doc.setTextColor(50);
const intro = [
    "Esta herramienta ha sido diseñada por Altim para proporcionar un control total y transparente",
    "sobre los servicios de soporte AM (Application Management) contratados. Sus funciones principales:",
    "",
    "• Gestión y control de consumos de soporte AM: Visualización en tiempo real de horas.",
    "• Gestión de evolutivos: Seguimiento detallado de peticiones de mejora y presupuestos.",
    "• Gestión y control de usuarios: Administración de acceso e integración con JIRA."
];
doc.text(intro, 20, 35);
addImageIfExists("dashboard.png", 30, 80, 150, 90);

// --- PERSONALIZACIÓN ---
doc.addPage();
doc.setFontSize(18);
doc.setTextColor(20, 50, 100);
doc.text("2. PERSONALIZACIÓN DE USUARIO", 20, 20);
doc.setFontSize(11);
doc.setTextColor(50);
doc.text([
    "Desde su perfil puede adaptar la herramienta a sus necesidades:",
    "• Idioma: Seleccione entre Español e Inglés.",
    "• Horario: Configure su zona horaria local.",
    "• Formato de fecha: Personalice la visualización en reportes."
], 20, 35);
addImageIfExists("preferences.png", 30, 60, 150, 90);

// --- NOTIFICACIONES ---
doc.addPage();
doc.setFontSize(18);
doc.setTextColor(20, 50, 100);
doc.text("3. NOTIFICACIONES", 20, 20);
doc.setFontSize(11);
doc.setTextColor(50);
doc.text([
    "El icono de campana en la barra superior le avisa de:",
    "• Cambios de estado en tickets.",
    "• Requerimientos de aprobación en evolutivos.",
    "• Histórico de eventos importantes."
], 20, 35);
addImageIfExists("notifications.png", 30, 60, 150, 80);

// --- DASHBOARD ---
doc.addPage();
doc.setFontSize(18);
doc.setTextColor(20, 50, 100);
doc.text("4. DASHBOARD DE CONSUMOS", 20, 20);
doc.setFontSize(10);
doc.setTextColor(50);
doc.text([
    "Acción central para el control del contrato:",
    "1. Seleccione el Contrato (Work Package) al entrar.",
    "2. Gráfico de progreso: Horas totales vs consumidas.",
    "3. Sincronización: Botón para refrescar datos desde JIRA/Tempo.",
    "4. Detalle Mensual: Desglose por tipo de tarea.",
    "5. Funciones Premium: Reclamación de horas y descarga a Excel de tickets específicos.",
    "6. Service Intelligence: Analítica avanzada para predicción de tendencias."
], 20, 30);
addImageIfExists("dashboard_detail.png", 30, 70, 150, 90);
addImageIfExists("dashboard_tickets.png", 30, 170, 150, 90);

// --- EVOLUTIVOS ---
doc.addPage();
doc.setFontSize(18);
doc.setTextColor(20, 50, 100);
doc.text("5. GESTIÓN DE EVOLUTIVOS", 20, 20);
doc.setFontSize(11);
doc.setTextColor(50);
doc.text([
    "Gestione sus proyectos de mejora:",
    "• Sincronización con JIRA para estados actualizados.",
    "• Filtros por estado (Presupuestado, En Curso, Finalizado).",
    "• Plan de Trabajo: Acceso a hitos y cronograma previsto."
], 20, 35);
doc.text("(Nota: Se requiere contrato de evolutivos activo para visualizar esta sección)", 20, 280);

// --- USUARIOS ---
doc.addPage();
doc.setFontSize(18);
doc.setTextColor(20, 50, 100);
doc.text("6. GESTIÓN DE USUARIOS", 20, 20);
doc.setFontSize(11);
doc.setTextColor(50);
doc.text([
    "Administre el acceso de su equipo:",
    "• Creación de nuevos usuarios con rol específico.",
    "• Usuarios de JIRA: Solicite altas/bajas directamente.",
    "• Vinculación: Enlace cuentas de JIRA con usuarios de la App."
], 20, 35);
addImageIfExists("user_management.png", 30, 60, 150, 80);
addImageIfExists("user_management_jira.png", 30, 150, 150, 80);

doc.save(outputPath);
console.log("PDF generado exitosamente en: " + outputPath);
