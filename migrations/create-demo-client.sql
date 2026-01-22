-- ============================================
-- Script de Creación de Cliente DEMO
-- Para ejecutar en Vercel Postgres (Producción)
-- ============================================

-- PASO 1: Agregar campo isDemo a la tabla Client (si no existe)
-- Esto permite filtrar clientes demo de reportes y vistas admin
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "isDemo" BOOLEAN NOT NULL DEFAULT false;

-- PASO 2: Crear Cliente Demo
INSERT INTO "Client" (
    id, 
    name, 
    manager, 
    "portalUrl", 
    "reportEmails",
    "isDemo",
    "createdAt",
    "updatedAt"
) VALUES (
    'DEMO-001',
    'TechCorp Solutions S.L.',
    'Demo Manager',
    'https://demo.techcorp-example.com',
    'demo@techcorp-example.com',
    true,  -- MARCADO COMO DEMO
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- PASO 3: Crear Usuario Demo (Cliente)
INSERT INTO "User" (
    id,
    name,
    surname,
    email,
    password,
    role,
    "clientId",
    locale,
    timezone,
    "createdAt",
    "updatedAt"
) VALUES (
    gen_random_uuid(),
    'Usuario',
    'Demo',
    'demo@techcorp-example.com',
    '$2b$10$9FIDfaHdn7p8ycxJOQ78XeA9hY4Ri84LWBbf4/KE.KuuP/wAhDkv2',  -- Password: Demo2025!
    'CLIENT',
    'DEMO-001',
    'es',
    'Europe/Madrid',
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- PASO 4: Crear Work Package Demo - Soporte Premium
INSERT INTO "WorkPackage" (
    id,
    name,
    "clientId",
    "clientName",
    "contractType",
    "billingType",
    "renewalType",
    "jiraProjectKeys",
    "tempoAccountId",
    "hasIaasService",
    "includeEvoEstimates",
    "includeEvoTM",
    "isMainWP",
    "createdAt",
    "updatedAt"
) VALUES (
    'DEMO-001-SOPORTE-2025',
    'Soporte Técnico Premium 2025',
    'DEMO-001',
    'TechCorp Solutions S.L.',
    'BOLSA',
    'MENSUAL',
    'AUTOMATICA',
    'DEMO,TECH',
    NULL,
    false,
    true,
    true,
    true,
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- PASO 5: Crear Periodo de Validez para el WP
INSERT INTO "ValidityPeriod" (
    "workPackageId",
    "startDate",
    "endDate",
    "totalQuantity",
    rate,
    "isPremium",
    "premiumPrice",
    "regularizationRate",
    "scopeUnit",
    "regularizationType",
    "surplusStrategy"
) VALUES (
    'DEMO-001-SOPORTE-2025',
    '2025-01-01',
    '2025-12-31',
    160.0,  -- 160 horas totales
    65.0,   -- 65€/hora
    true,
    75.0,   -- Premium: 75€/hora
    70.0,   -- Regularización: 70€/hora
    'HORAS',
    'EXCESO',
    'ACUMULAR'
) ON CONFLICT DO NOTHING;

-- PASO 6: Crear Tickets Demo
INSERT INTO "Ticket" (
    "workPackageId",
    "issueKey",
    "issueSummary",
    "issueType",
    "createdDate",
    year,
    month,
    status,
    reporter,
    "reporterEmail",
    priority,
    "slaResponse",
    "slaResolution"
) VALUES 
(
    'DEMO-001-SOPORTE-2025',
    'DEMO-101',
    'Optimización de rendimiento del portal',
    'Incidencia',
    '2025-01-15',
    2025,
    1,
    'Cerrado',
    'Juan Pérez',
    'juan.perez@techcorp-example.com',
    'Alta',
    '4h',
    '24h'
),
(
    'DEMO-001-SOPORTE-2025',
    'DEMO-102',
    'Actualización de dependencias de seguridad',
    'Tarea',
    '2025-02-10',
    2025,
    2,
    'Cerrado',
    'María García',
    'maria.garcia@techcorp-example.com',
    'Media',
    '8h',
    '48h'
),
(
    'DEMO-001-SOPORTE-2025',
    'DEMO-103',
    'Implementación de nueva funcionalidad de reportes',
    'Evolutivo',
    '2025-03-05',
    2025,
    3,
    'En Progreso',
    'Carlos Ruiz',
    'carlos.ruiz@techcorp-example.com',
    'Alta',
    '8h',
    '72h'
),
(
    'DEMO-001-SOPORTE-2025',
    'TECH-45',
    'Resolución de error en módulo de facturación',
    'Incidencia',
    '2025-04-12',
    2025,
    4,
    'Cerrado',
    'Ana López',
    'ana.lopez@techcorp-example.com',
    'Crítica',
    '2h',
    '8h'
),
(
    'DEMO-001-SOPORTE-2025',
    'TECH-46',
    'Configuración de backup automático',
    'Tarea',
    '2025-04-18',
    2025,
    4,
    'Cerrado',
    'Pedro Sánchez',
    'pedro.sanchez@techcorp-example.com',
    'Media',
    '8h',
    '48h'
)
ON CONFLICT ("workPackageId", "issueKey") DO NOTHING;

-- PASO 7: Crear Worklogs Demo (Consumos)
INSERT INTO "WorklogDetail" (
    "workPackageId",
    year,
    month,
    "issueKey",
    "issueType",
    "issueSummary",
    "timeSpentHours",
    "startDate",
    author,
    "tipoImputacion",
    "originWpId"
) VALUES 
-- Enero 2025: 32 horas
('DEMO-001-SOPORTE-2025', 2025, 1, 'DEMO-101', 'Incidencia', 'Optimización de rendimiento del portal', 8.5, '2025-01-15', 'Juan Pérez', 'NORMAL', 'DEMO-001-SOPORTE-2025'),
('DEMO-001-SOPORTE-2025', 2025, 1, 'DEMO-101', 'Incidencia', 'Optimización de rendimiento del portal', 6.0, '2025-01-16', 'María García', 'NORMAL', 'DEMO-001-SOPORTE-2025'),
('DEMO-001-SOPORTE-2025', 2025, 1, 'TECH-45', 'Incidencia', 'Soporte técnico general', 12.5, '2025-01-20', 'Carlos Ruiz', 'NORMAL', 'DEMO-001-SOPORTE-2025'),
('DEMO-001-SOPORTE-2025', 2025, 1, 'TECH-46', 'Tarea', 'Mantenimiento preventivo', 5.0, '2025-01-25', 'Ana López', 'NORMAL', 'DEMO-001-SOPORTE-2025'),

-- Febrero 2025: 28 horas
('DEMO-001-SOPORTE-2025', 2025, 2, 'DEMO-102', 'Tarea', 'Actualización de dependencias de seguridad', 4.0, '2025-02-10', 'Juan Pérez', 'NORMAL', 'DEMO-001-SOPORTE-2025'),
('DEMO-001-SOPORTE-2025', 2025, 2, 'DEMO-102', 'Tarea', 'Actualización de dependencias de seguridad', 8.0, '2025-02-11', 'María García', 'NORMAL', 'DEMO-001-SOPORTE-2025'),
('DEMO-001-SOPORTE-2025', 2025, 2, 'TECH-45', 'Incidencia', 'Soporte técnico', 10.0, '2025-02-15', 'Carlos Ruiz', 'NORMAL', 'DEMO-001-SOPORTE-2025'),
('DEMO-001-SOPORTE-2025', 2025, 2, 'TECH-46', 'Tarea', 'Configuración', 6.0, '2025-02-20', 'Pedro Sánchez', 'NORMAL', 'DEMO-001-SOPORTE-2025'),

-- Marzo 2025: 35 horas
('DEMO-001-SOPORTE-2025', 2025, 3, 'DEMO-103', 'Evolutivo', 'Implementación de nueva funcionalidad de reportes', 12.5, '2025-03-05', 'Juan Pérez', 'NORMAL', 'DEMO-001-SOPORTE-2025'),
('DEMO-001-SOPORTE-2025', 2025, 3, 'DEMO-103', 'Evolutivo', 'Implementación de nueva funcionalidad de reportes', 10.0, '2025-03-08', 'María García', 'NORMAL', 'DEMO-001-SOPORTE-2025'),
('DEMO-001-SOPORTE-2025', 2025, 3, 'TECH-45', 'Incidencia', 'Resolución de incidencias', 7.5, '2025-03-15', 'Carlos Ruiz', 'NORMAL', 'DEMO-001-SOPORTE-2025'),
('DEMO-001-SOPORTE-2025', 2025, 3, 'TECH-46', 'Tarea', 'Mantenimiento', 5.0, '2025-03-20', 'Ana López', 'NORMAL', 'DEMO-001-SOPORTE-2025'),

-- Abril 2025: 30 horas (mes actual para demo)
('DEMO-001-SOPORTE-2025', 2025, 4, 'TECH-45', 'Incidencia', 'Resolución de error en módulo de facturación', 3.5, '2025-04-12', 'Ana López', 'NORMAL', 'DEMO-001-SOPORTE-2025'),
('DEMO-001-SOPORTE-2025', 2025, 4, 'TECH-46', 'Tarea', 'Configuración de backup automático', 2.0, '2025-04-18', 'Pedro Sánchez', 'NORMAL', 'DEMO-001-SOPORTE-2025'),
('DEMO-001-SOPORTE-2025', 2025, 4, 'DEMO-103', 'Evolutivo', 'Desarrollo de reportes', 15.0, '2025-04-10', 'Juan Pérez', 'NORMAL', 'DEMO-001-SOPORTE-2025'),
('DEMO-001-SOPORTE-2025', 2025, 4, 'DEMO-101', 'Incidencia', 'Optimización adicional', 9.5, '2025-04-05', 'María García', 'NORMAL', 'DEMO-001-SOPORTE-2025')
ON CONFLICT DO NOTHING;

-- PASO 8: Crear Métricas Mensuales
INSERT INTO "MonthlyMetric" (
    "workPackageId",
    year,
    month,
    "consumedHours"
) VALUES 
('DEMO-001-SOPORTE-2025', 2025, 1, 32.0),
('DEMO-001-SOPORTE-2025', 2025, 2, 28.0),
('DEMO-001-SOPORTE-2025', 2025, 3, 35.0),
('DEMO-001-SOPORTE-2025', 2025, 4, 30.0)
ON CONFLICT ("workPackageId", year, month) DO NOTHING;

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Verificar que el cliente se creó correctamente
SELECT id, name, "isDemo" FROM "Client" WHERE id = 'DEMO-001';

-- Verificar usuario demo
SELECT id, email, role, "clientId" FROM "User" WHERE email = 'demo@techcorp-example.com';

-- Verificar work package
SELECT id, name, "clientId" FROM "WorkPackage" WHERE id = 'DEMO-001-SOPORTE-2025';

-- Verificar tickets
SELECT "issueKey", "issueSummary", status FROM "Ticket" WHERE "workPackageId" = 'DEMO-001-SOPORTE-2025';

-- Verificar consumos totales
SELECT year, month, SUM("timeSpentHours") as total_hours 
FROM "WorklogDetail" 
WHERE "workPackageId" = 'DEMO-001-SOPORTE-2025' 
GROUP BY year, month 
ORDER BY year, month;

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================

-- 1. El password hasheado debe generarse con bcrypt
--    Para generar: await bcrypt.hash('Demo2025!', 10)
--    
-- 2. El cliente está marcado como isDemo = true
--    Esto permite filtrarlo de reportes admin
--
-- 3. Los datos son ficticios pero realistas
--    - Nombres genéricos
--    - Emails con dominio @techcorp-example.com
--    - IDs empiezan con DEMO- o TECH-
--
-- 4. Total de consumo: 125 horas de 160 contratadas
--    - Enero: 32h
--    - Febrero: 28h
--    - Marzo: 35h
--    - Abril: 30h
--    - Disponible: 35h
