ALTER TABLE "Project"
  ADD COLUMN "leadId" TEXT,
  ADD COLUMN "projectType" TEXT NOT NULL DEFAULT 'kanban',
  ADD COLUMN "category" TEXT;

CREATE INDEX "Project_leadId_idx" ON "Project"("leadId");
CREATE INDEX "Project_projectType_idx" ON "Project"("projectType");
