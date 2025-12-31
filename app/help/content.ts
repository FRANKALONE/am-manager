export interface HelpSection {
    id: string;
    title: string;
    permission?: string;
    icon: string;
    content: {
        subtitle?: string;
        text: string;
        items?: string[];
        note?: string;
    }[];
}

export const MANUAL_CONTENT: HelpSection[] = [
    {
        id: "intro",
        title: "Introducción",
        icon: "Info",
        content: [
            {
                text: "Bienvenido al portal AM Manager v2512.3. Este sistema le permite monitorizar los consumos de sus servicios de Application Management de forma transparente y en tiempo real."
            }
        ]
    },
    {
        id: "auth",
        title: "Acceso y Seguridad",
        icon: "Lock",
        content: [
            {
                subtitle: "Recuperación de Contraseña",
                text: "Si ha olvidado su contraseña, puede utilizar la opción '¿Olvidaste tu contraseña?' en la pantalla de inicio de sesión para recibir un enlace de restablecimiento en su correo electrónico corporativo."
            }
        ]
    },
    {
        id: "dashboard",
        title: "Dashboard de Consumos",
        permission: "view_dashboard",
        icon: "LayoutDashboard",
        content: [
            {
                subtitle: "Vista General",
                text: "En el dashboard principal podrá visualizar las métricas clave del periodo actual:",
                items: [
                    "Horas Contratadas vs Consumidas",
                    "Evolución mensual del consumo",
                    "Desglose por tipo de ticket (Incidencias, Evolutivos, etc.)"
                ]
            },
            {
                subtitle: "Detalle Mensual y Reclamaciones",
                text: "Al expandir una fila mensual, verá el desglose de tickets. Si un ticket muestra el distintivo 'DEVUELTO' en rojo, significa que ha sido reconocido como una devolución tras una reclamación."
            }
        ]
    },
    {
        id: "reviews",
        title: "Reclamación de Horas",
        permission: "request_review",
        icon: "MessageSquare",
        content: [
            {
                subtitle: "¿Cómo solicitar una revisión?",
                text: "Si no está de acuerdo con alguna imputación:",
                items: [
                    "Vaya al detalle mensual del dashboard.",
                    "Seleccione las imputaciones marcando el checkbox a la izquierda.",
                    "Pulse el botón 'Solicitar Revisión' que aparecerá al final de la tabla.",
                    "Escriba el motivo de su reclamación."
                ],
                note: "Una vez aprobada, el sistema marcará los tickets como 'DEVUELTO' y ajustará el balance automáticamente."
            }
        ]
    },
    {
        id: "admin_wps",
        title: "Gestión de Work Packages",
        permission: "manage_wps",
        icon: "Briefcase",
        content: [
            {
                subtitle: "Configuración y Sincronización",
                text: "Los administradores pueden gestionar el ciclo de vida de los WPs:",
                items: [
                    "Ajuste de periodos de vigencia (fechas inclusivas).",
                    "Sincronización automática con JIRA y Tempo Author identification.",
                    "Control de duplicados en consumos manuales."
                ]
            }
        ]
    }
];
