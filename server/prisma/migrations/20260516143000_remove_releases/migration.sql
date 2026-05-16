DELETE FROM "ActivityEvent"
WHERE "entityType" = 'release' OR "type" LIKE 'release.%';

DROP TABLE IF EXISTS "Release";
