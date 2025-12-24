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
                text: "Bienvenido al portal AM Manager. Este sistema le permite monitorizar los consumos de sus servicios de Application Management de forma transparente y en tiempo real."
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
                subtitle: "Detalle Mensual",
                text: "Al expandir una fila mensual, verá el listado completo de imputaciones y tickets asociados a ese mes."
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
                note: "Una vez enviada, un administrador revisará su solicitud y recibirá una notificación con la decisión."
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
                subtitle: "Configuración de Contratos",
                text: "Los administradores pueden configurar los parámetros económicos de cada Work Package:",
                items: [
                    "Tarifas y alcances por periodo.",
                    "Sincronización con JIRA/Tempo.",
                    "Gestión de regularizaciones manuales (excesos o devoluciones)."
                ]
            }
        ]
    },
    {
        id: "admin_reviews",
        title: "Gestión de Reclamaciones (Admin)",
        permission: "manage_reviews",
        icon: "CheckSquare",
        content: [
            {
                subtitle: "Aprobación y Rechazo",
                text: "Al recibir una reclamación, puede:",
                items: [
                    "Ver el detalle y motivo del cliente.",
                    "Seleccionar qué horas reconoce para devolución.",
                    "Aprobar: El sistema generará automáticamente una regularización tipo RETURN.",
                    "Rechazar: Deberá indicar el motivo para notificar al cliente."
                ]
            }
        ]
    }
];
