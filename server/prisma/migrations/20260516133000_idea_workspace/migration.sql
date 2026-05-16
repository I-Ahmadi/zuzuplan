CREATE TABLE IF NOT EXISTS "IdeaWorkspace" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "problem" TEXT,
  "opportunity" TEXT,
  "stage" TEXT NOT NULL DEFAULT 'CAPTURED',
  "confidence" INTEGER NOT NULL DEFAULT 25,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "ownerId" TEXT NOT NULL,
  "convertedProjectId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IdeaWorkspace_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "IdeaMember" (
  "id" TEXT NOT NULL,
  "ideaId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'Employee',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IdeaMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "IdeaSection" (
  "id" TEXT NOT NULL,
  "ideaId" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'NOTE',
  "title" TEXT NOT NULL,
  "contentJson" JSONB,
  "plainText" TEXT NOT NULL DEFAULT '',
  "order" INTEGER NOT NULL DEFAULT 0,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IdeaSection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "IdeaExperiment" (
  "id" TEXT NOT NULL,
  "ideaId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "hypothesis" TEXT,
  "method" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PLANNED',
  "result" TEXT,
  "evidence" TEXT,
  "ownerId" TEXT,
  "dueDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IdeaExperiment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "IdeaRequirement" (
  "id" TEXT NOT NULL,
  "ideaId" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'REQUIREMENT',
  "title" TEXT NOT NULL,
  "description" TEXT,
  "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
  "acceptanceNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IdeaRequirement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "IdeaGoal" (
  "id" TEXT NOT NULL,
  "ideaId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "metric" TEXT,
  "target" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IdeaGoal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "IdeaComment" (
  "id" TEXT NOT NULL,
  "ideaId" TEXT NOT NULL,
  "sectionId" TEXT,
  "userId" TEXT NOT NULL,
  "parentId" TEXT,
  "content" TEXT NOT NULL,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IdeaComment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "IdeaVersion" (
  "id" TEXT NOT NULL,
  "ideaId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "snapshotJson" JSONB NOT NULL,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IdeaVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "IdeaConversion" (
  "id" TEXT NOT NULL,
  "ideaId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "conversionPlanJson" JSONB NOT NULL,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IdeaConversion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "IdeaLink" (
  "id" TEXT NOT NULL,
  "ideaId" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT,
  "url" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IdeaLink_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "IdeaWorkspace_ownerId_idx" ON "IdeaWorkspace"("ownerId");
CREATE INDEX IF NOT EXISTS "IdeaWorkspace_convertedProjectId_idx" ON "IdeaWorkspace"("convertedProjectId");
CREATE INDEX IF NOT EXISTS "IdeaWorkspace_stage_idx" ON "IdeaWorkspace"("stage");
CREATE INDEX IF NOT EXISTS "IdeaWorkspace_updatedAt_idx" ON "IdeaWorkspace"("updatedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "IdeaMember_ideaId_userId_key" ON "IdeaMember"("ideaId", "userId");
CREATE INDEX IF NOT EXISTS "IdeaMember_ideaId_idx" ON "IdeaMember"("ideaId");
CREATE INDEX IF NOT EXISTS "IdeaMember_userId_idx" ON "IdeaMember"("userId");
CREATE INDEX IF NOT EXISTS "IdeaSection_ideaId_idx" ON "IdeaSection"("ideaId");
CREATE INDEX IF NOT EXISTS "IdeaSection_type_idx" ON "IdeaSection"("type");
CREATE INDEX IF NOT EXISTS "IdeaSection_updatedById_idx" ON "IdeaSection"("updatedById");
CREATE INDEX IF NOT EXISTS "IdeaSection_updatedAt_idx" ON "IdeaSection"("updatedAt");
CREATE INDEX IF NOT EXISTS "IdeaExperiment_ideaId_idx" ON "IdeaExperiment"("ideaId");
CREATE INDEX IF NOT EXISTS "IdeaExperiment_ownerId_idx" ON "IdeaExperiment"("ownerId");
CREATE INDEX IF NOT EXISTS "IdeaExperiment_status_idx" ON "IdeaExperiment"("status");
CREATE INDEX IF NOT EXISTS "IdeaExperiment_dueDate_idx" ON "IdeaExperiment"("dueDate");
CREATE INDEX IF NOT EXISTS "IdeaRequirement_ideaId_idx" ON "IdeaRequirement"("ideaId");
CREATE INDEX IF NOT EXISTS "IdeaRequirement_type_idx" ON "IdeaRequirement"("type");
CREATE INDEX IF NOT EXISTS "IdeaRequirement_priority_idx" ON "IdeaRequirement"("priority");
CREATE INDEX IF NOT EXISTS "IdeaGoal_ideaId_idx" ON "IdeaGoal"("ideaId");
CREATE INDEX IF NOT EXISTS "IdeaGoal_status_idx" ON "IdeaGoal"("status");
CREATE INDEX IF NOT EXISTS "IdeaComment_ideaId_idx" ON "IdeaComment"("ideaId");
CREATE INDEX IF NOT EXISTS "IdeaComment_sectionId_idx" ON "IdeaComment"("sectionId");
CREATE INDEX IF NOT EXISTS "IdeaComment_userId_idx" ON "IdeaComment"("userId");
CREATE INDEX IF NOT EXISTS "IdeaComment_parentId_idx" ON "IdeaComment"("parentId");
CREATE INDEX IF NOT EXISTS "IdeaComment_createdAt_idx" ON "IdeaComment"("createdAt");
CREATE INDEX IF NOT EXISTS "IdeaVersion_ideaId_idx" ON "IdeaVersion"("ideaId");
CREATE INDEX IF NOT EXISTS "IdeaVersion_createdById_idx" ON "IdeaVersion"("createdById");
CREATE INDEX IF NOT EXISTS "IdeaVersion_createdAt_idx" ON "IdeaVersion"("createdAt");
CREATE INDEX IF NOT EXISTS "IdeaConversion_ideaId_idx" ON "IdeaConversion"("ideaId");
CREATE INDEX IF NOT EXISTS "IdeaConversion_projectId_idx" ON "IdeaConversion"("projectId");
CREATE INDEX IF NOT EXISTS "IdeaConversion_createdById_idx" ON "IdeaConversion"("createdById");
CREATE INDEX IF NOT EXISTS "IdeaLink_ideaId_idx" ON "IdeaLink"("ideaId");
CREATE INDEX IF NOT EXISTS "IdeaLink_targetType_idx" ON "IdeaLink"("targetType");
CREATE INDEX IF NOT EXISTS "IdeaLink_targetId_idx" ON "IdeaLink"("targetId");

ALTER TABLE "IdeaWorkspace" ADD CONSTRAINT "IdeaWorkspace_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IdeaWorkspace" ADD CONSTRAINT "IdeaWorkspace_convertedProjectId_fkey" FOREIGN KEY ("convertedProjectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IdeaMember" ADD CONSTRAINT "IdeaMember_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "IdeaWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IdeaMember" ADD CONSTRAINT "IdeaMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IdeaSection" ADD CONSTRAINT "IdeaSection_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "IdeaWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IdeaSection" ADD CONSTRAINT "IdeaSection_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IdeaExperiment" ADD CONSTRAINT "IdeaExperiment_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "IdeaWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IdeaExperiment" ADD CONSTRAINT "IdeaExperiment_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IdeaRequirement" ADD CONSTRAINT "IdeaRequirement_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "IdeaWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IdeaGoal" ADD CONSTRAINT "IdeaGoal_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "IdeaWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IdeaComment" ADD CONSTRAINT "IdeaComment_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "IdeaWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IdeaComment" ADD CONSTRAINT "IdeaComment_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "IdeaSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IdeaComment" ADD CONSTRAINT "IdeaComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IdeaComment" ADD CONSTRAINT "IdeaComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "IdeaComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IdeaVersion" ADD CONSTRAINT "IdeaVersion_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "IdeaWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IdeaVersion" ADD CONSTRAINT "IdeaVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IdeaConversion" ADD CONSTRAINT "IdeaConversion_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "IdeaWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IdeaLink" ADD CONSTRAINT "IdeaLink_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "IdeaWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
