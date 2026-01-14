-- Migración: Agregar permiso manage_ama_evolutivos a roles existentes
-- Fecha: 2026-01-14
-- Propósito: Habilitar control de acceso para el módulo AMA Evolutivos

-- Agregar el permiso manage_ama_evolutivos a los roles ADMIN y GERENTE
UPDATE "Role"
SET permissions = CASE 
  WHEN permissions LIKE '%}' THEN 
    REPLACE(permissions, '}', ',"manage_ama_evolutivos":true}')
  ELSE permissions
END
WHERE name IN ('ADMIN', 'GERENTE')
AND permissions NOT LIKE '%manage_ama_evolutivos%';

-- Verificar la migración
SELECT name, permissions 
FROM "Role" 
WHERE name IN ('ADMIN', 'GERENTE');
