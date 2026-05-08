-- Tighten project/member defaults and add indexes used by project-scoped access checks.
ALTER TABLE "ProjectMember" ALTER COLUMN "role" SET DEFAULT 'Employee';

CREATE UNIQUE INDEX "Project_ownerId_key_key" ON "Project"("ownerId", "key");
CREATE INDEX "Project_ownerId_idx" ON "Project"("ownerId");
CREATE INDEX "Project_status_idx" ON "Project"("status");
CREATE INDEX "Task_projectId_idx" ON "Task"("projectId");
CREATE INDEX "Task_assigneeId_idx" ON "Task"("assigneeId");
CREATE INDEX "Task_createdById_idx" ON "Task"("createdById");
CREATE INDEX "Task_status_idx" ON "Task"("status");
CREATE INDEX "Task_priority_idx" ON "Task"("priority");
