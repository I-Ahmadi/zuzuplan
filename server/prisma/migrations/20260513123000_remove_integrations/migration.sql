ALTER TABLE "PullRequest" DROP CONSTRAINT IF EXISTS "PullRequest_integrationId_fkey";
ALTER TABLE "Deployment" DROP CONSTRAINT IF EXISTS "Deployment_integrationId_fkey";

DROP INDEX IF EXISTS "Integration_projectId_idx";
DROP INDEX IF EXISTS "Integration_provider_idx";
DROP INDEX IF EXISTS "Integration_status_idx";

ALTER TABLE "PullRequest" DROP COLUMN IF EXISTS "integrationId";
ALTER TABLE "Deployment" DROP COLUMN IF EXISTS "integrationId";

DELETE FROM "ActivityEvent"
WHERE "entityType" = 'integration'
   OR "type" LIKE 'integration.%';

DROP TABLE IF EXISTS "Integration";
