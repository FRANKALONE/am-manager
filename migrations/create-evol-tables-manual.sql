-- Migración Manual: Agregar Tablas EVOL para Módulo AMA Evolutivos
-- Fecha: 2026-01-14
-- Descripción: Crea las tablas EVOLDailyMetric y EVOLEvolutivoUser

-- =============================================
-- 1. Tabla: EVOLDailyMetric
-- =============================================
CREATE TABLE IF NOT EXISTS "EVOLDailyMetric" (
    "id" SERIAL PRIMARY KEY,
    "date" TIMESTAMP(3) NOT NULL UNIQUE,
    "count" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- =============================================
-- 2. Tabla: EVOLEvolutivoUser
-- =============================================
CREATE TABLE IF NOT EXISTS "EVOLEvolutivoUser" (
    "id" SERIAL PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "avatar" TEXT,
    "jiraGestorName" TEXT,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "linkedUserId" TEXT UNIQUE,
    CONSTRAINT "EVOLEvolutivoUser_linkedUserId_fkey" 
        FOREIGN KEY ("linkedUserId") 
        REFERENCES "User"("id") 
        ON DELETE SET NULL 
        ON UPDATE CASCADE
);

-- =============================================
-- 3. Índices
-- =============================================
CREATE UNIQUE INDEX IF NOT EXISTS "EVOLDailyMetric_date_key" ON "EVOLDailyMetric"("date");
CREATE UNIQUE INDEX IF NOT EXISTS "EVOLEvolutivoUser_email_key" ON "EVOLEvolutivoUser"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "EVOLEvolutivoUser_linkedUserId_key" ON "EVOLEvolutivoUser"("linkedUserId");

-- =============================================
-- 4. Verificación
-- =============================================
-- Verificar que las tablas se crearon correctamente
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('EVOLDailyMetric', 'EVOLEvolutivoUser')
ORDER BY table_name;

-- Verificar estructura de EVOLDailyMetric
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'EVOLDailyMetric'
ORDER BY ordinal_position;

-- Verificar estructura de EVOLEvolutivoUser
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'EVOLEvolutivoUser'
ORDER BY ordinal_position;

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ Migración completada: Tablas EVOL creadas exitosamente';
END $$;
