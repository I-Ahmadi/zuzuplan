DELETE FROM "InboxItem"
WHERE "source" = 'github'
   OR "type" IN ('github', 'pull_request', 'pull_request_review', 'ci_status');

DELETE FROM "ActivityEvent"
WHERE "type" LIKE 'github.%';

UPDATE "PullRequest"
SET "provider" = 'MANUAL'
WHERE "provider" = 'GITHUB';

ALTER TABLE "PullRequest"
ALTER COLUMN "provider" SET DEFAULT 'MANUAL';

DELETE FROM "Integration"
WHERE "provider" = 'GITHUB';
