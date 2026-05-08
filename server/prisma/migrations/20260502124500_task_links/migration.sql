CREATE TABLE "TaskLink" (
    "id" TEXT NOT NULL,
    "sourceTaskId" TEXT NOT NULL,
    "targetTaskId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'RELATES_TO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TaskLink_sourceTaskId_targetTaskId_type_key" ON "TaskLink"("sourceTaskId", "targetTaskId", "type");
CREATE INDEX "TaskLink_sourceTaskId_idx" ON "TaskLink"("sourceTaskId");
CREATE INDEX "TaskLink_targetTaskId_idx" ON "TaskLink"("targetTaskId");

ALTER TABLE "TaskLink" ADD CONSTRAINT "TaskLink_sourceTaskId_fkey" FOREIGN KEY ("sourceTaskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskLink" ADD CONSTRAINT "TaskLink_targetTaskId_fkey" FOREIGN KEY ("targetTaskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
