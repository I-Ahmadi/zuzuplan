DROP INDEX IF EXISTS "Project_projectType_idx";
DROP INDEX IF EXISTS "Project_leadId_idx";

ALTER TABLE "Project"
  DROP COLUMN IF EXISTS "category",
  DROP COLUMN IF EXISTS "projectType",
  DROP COLUMN IF EXISTS "leadId";
