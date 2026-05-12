ALTER TABLE "Task"
  ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'FEATURE',
  ADD COLUMN IF NOT EXISTS "estimate" INTEGER,
  ADD COLUMN IF NOT EXISTS "branchName" TEXT,
  ADD COLUMN IF NOT EXISTS "blockedReason" TEXT,
  ADD COLUMN IF NOT EXISTS "readyAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "mergedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deployedAt" TIMESTAMP(3);

UPDATE "Task" SET "status" = 'BACKLOG' WHERE "status" = 'TODO';
UPDATE "Task" SET "status" = 'CANCELED' WHERE "status" = 'CANCELLED';

CREATE TABLE IF NOT EXISTS "ActivityEvent" (
  "id" TEXT NOT NULL,
  "projectId" TEXT,
  "taskId" TEXT,
  "actorId" TEXT,
  "targetUserId" TEXT,
  "type" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "severity" TEXT NOT NULL DEFAULT 'INFO',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActivityEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "InboxItem" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "projectId" TEXT,
  "taskId" TEXT,
  "activityEventId" TEXT,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "priority" TEXT NOT NULL DEFAULT 'NORMAL',
  "status" TEXT NOT NULL DEFAULT 'UNREAD',
  "actionUrl" TEXT,
  "source" TEXT,
  "readAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "snoozedUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InboxItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Integration" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "repository" TEXT,
  "externalId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'CONNECTED',
  "config" JSONB,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PullRequest" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "taskId" TEXT,
  "integrationId" TEXT,
  "provider" TEXT NOT NULL DEFAULT 'GITHUB',
  "repository" TEXT NOT NULL,
  "number" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "url" TEXT,
  "branch" TEXT,
  "targetBranch" TEXT,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "reviewState" TEXT NOT NULL DEFAULT 'REQUESTED',
  "ciStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "author" TEXT,
  "openedAt" TIMESTAMP(3),
  "mergedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PullRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Deployment" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "taskId" TEXT,
  "pullRequestId" TEXT,
  "integrationId" TEXT,
  "environment" TEXT NOT NULL DEFAULT 'staging',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "version" TEXT,
  "url" TEXT,
  "deployedBy" TEXT,
  "deployedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Deployment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Release" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "version" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PLANNED',
  "summary" TEXT,
  "createdById" TEXT NOT NULL,
  "shippedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Release_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Task_type_idx" ON "Task"("type");
CREATE INDEX IF NOT EXISTS "Task_updatedAt_idx" ON "Task"("updatedAt");
CREATE INDEX IF NOT EXISTS "ActivityEvent_projectId_idx" ON "ActivityEvent"("projectId");
CREATE INDEX IF NOT EXISTS "ActivityEvent_taskId_idx" ON "ActivityEvent"("taskId");
CREATE INDEX IF NOT EXISTS "ActivityEvent_actorId_idx" ON "ActivityEvent"("actorId");
CREATE INDEX IF NOT EXISTS "ActivityEvent_targetUserId_idx" ON "ActivityEvent"("targetUserId");
CREATE INDEX IF NOT EXISTS "ActivityEvent_entityType_entityId_idx" ON "ActivityEvent"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "ActivityEvent_createdAt_idx" ON "ActivityEvent"("createdAt");
CREATE INDEX IF NOT EXISTS "InboxItem_userId_idx" ON "InboxItem"("userId");
CREATE INDEX IF NOT EXISTS "InboxItem_projectId_idx" ON "InboxItem"("projectId");
CREATE INDEX IF NOT EXISTS "InboxItem_taskId_idx" ON "InboxItem"("taskId");
CREATE INDEX IF NOT EXISTS "InboxItem_status_idx" ON "InboxItem"("status");
CREATE INDEX IF NOT EXISTS "InboxItem_type_idx" ON "InboxItem"("type");
CREATE INDEX IF NOT EXISTS "InboxItem_createdAt_idx" ON "InboxItem"("createdAt");
CREATE INDEX IF NOT EXISTS "Integration_projectId_idx" ON "Integration"("projectId");
CREATE INDEX IF NOT EXISTS "Integration_provider_idx" ON "Integration"("provider");
CREATE INDEX IF NOT EXISTS "Integration_status_idx" ON "Integration"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "PullRequest_projectId_provider_repository_number_key" ON "PullRequest"("projectId", "provider", "repository", "number");
CREATE INDEX IF NOT EXISTS "PullRequest_projectId_idx" ON "PullRequest"("projectId");
CREATE INDEX IF NOT EXISTS "PullRequest_taskId_idx" ON "PullRequest"("taskId");
CREATE INDEX IF NOT EXISTS "PullRequest_status_idx" ON "PullRequest"("status");
CREATE INDEX IF NOT EXISTS "PullRequest_reviewState_idx" ON "PullRequest"("reviewState");
CREATE INDEX IF NOT EXISTS "PullRequest_ciStatus_idx" ON "PullRequest"("ciStatus");
CREATE INDEX IF NOT EXISTS "Deployment_projectId_idx" ON "Deployment"("projectId");
CREATE INDEX IF NOT EXISTS "Deployment_taskId_idx" ON "Deployment"("taskId");
CREATE INDEX IF NOT EXISTS "Deployment_environment_idx" ON "Deployment"("environment");
CREATE INDEX IF NOT EXISTS "Deployment_status_idx" ON "Deployment"("status");
CREATE INDEX IF NOT EXISTS "Deployment_deployedAt_idx" ON "Deployment"("deployedAt");
CREATE INDEX IF NOT EXISTS "Release_projectId_idx" ON "Release"("projectId");
CREATE INDEX IF NOT EXISTS "Release_status_idx" ON "Release"("status");
CREATE INDEX IF NOT EXISTS "Release_shippedAt_idx" ON "Release"("shippedAt");

ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InboxItem" ADD CONSTRAINT "InboxItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InboxItem" ADD CONSTRAINT "InboxItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InboxItem" ADD CONSTRAINT "InboxItem_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InboxItem" ADD CONSTRAINT "InboxItem_activityEventId_fkey" FOREIGN KEY ("activityEventId") REFERENCES "ActivityEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Integration" ADD CONSTRAINT "Integration_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Integration" ADD CONSTRAINT "Integration_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PullRequest" ADD CONSTRAINT "PullRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PullRequest" ADD CONSTRAINT "PullRequest_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PullRequest" ADD CONSTRAINT "PullRequest_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_pullRequestId_fkey" FOREIGN KEY ("pullRequestId") REFERENCES "PullRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Release" ADD CONSTRAINT "Release_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Release" ADD CONSTRAINT "Release_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
