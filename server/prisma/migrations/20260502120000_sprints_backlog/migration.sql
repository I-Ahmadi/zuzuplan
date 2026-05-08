CREATE TABLE "Sprint" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "goal" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "projectId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sprint_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Task" ADD COLUMN "sprintId" TEXT;
ALTER TABLE "Task" ADD COLUMN "estimate" INTEGER;
ALTER TABLE "Task" ADD COLUMN "backlogOrder" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Task" ADD COLUMN "sprintOrder" DOUBLE PRECISION NOT NULL DEFAULT 0;

CREATE INDEX "Sprint_projectId_idx" ON "Sprint"("projectId");
CREATE INDEX "Sprint_status_idx" ON "Sprint"("status");
CREATE INDEX "Task_sprintId_idx" ON "Task"("sprintId");

ALTER TABLE "Sprint" ADD CONSTRAINT "Sprint_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "Sprint"("id") ON DELETE SET NULL ON UPDATE CASCADE;
