-- Add isPremium column to Role table
ALTER TABLE "Role" ADD COLUMN IF NOT EXISTS "isPremium" INTEGER NOT NULL DEFAULT 0;

-- Update existing roles: Set ADMIN, GERENTE, and DIRECTOR as premium
UPDATE "Role" 
SET "isPremium" = 1 
WHERE "name" IN ('ADMIN', 'GERENTE', 'DIRECTOR');

-- Migrate view_dashboard permissions to specific dashboard permissions
UPDATE "Role"
SET "permissions" = 
    CASE 
        WHEN "name" = 'ADMIN' THEN 
            REPLACE("permissions", '"view_dashboard":true', '"view_admin_dashboard":true')
        WHEN "name" IN ('GERENTE', 'DIRECTOR') THEN 
            REPLACE("permissions", '"view_dashboard":true', '"view_manager_dashboard":true')
        ELSE 
            REPLACE("permissions", '"view_dashboard":true', '"view_client_dashboard":true')
    END
WHERE "permissions" LIKE '%"view_dashboard":true%';
