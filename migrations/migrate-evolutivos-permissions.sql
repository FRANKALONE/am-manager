-- Migration to add new Evolutivos permissions
-- view_evolutivos_admin: for ADMIN and GERENTE roles
-- view_evolutivos_client: for CLIENTE roles

-- Update ADMIN role (usually has {"all": true}, but let's be explicit if needed or just skip as hasPermission handles it)
-- Update GERENTE role
UPDATE "Role" 
SET permissions = jsonb_set(permissions::jsonb, '{view_evolutivos_admin}', 'true')
WHERE name IN ('GERENTE', 'DIRECTOR');

-- Update CLIENTE role
UPDATE "Role" 
SET permissions = jsonb_set(permissions::jsonb, '{view_evolutivos_client}', 'true')
WHERE name = 'CLIENTE';

-- Ensure ADMIN still has all
-- UPDATE "Role" SET permissions = '{"all": true}' WHERE name = 'ADMIN';
