CREATE TABLE "ProjectDoc" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "projectId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectDoc_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectDoc_projectId_idx" ON "ProjectDoc"("projectId");
CREATE INDEX "ProjectDoc_createdById_idx" ON "ProjectDoc"("createdById");
CREATE INDEX "ProjectDoc_pinned_idx" ON "ProjectDoc"("pinned");

ALTER TABLE "ProjectDoc" ADD CONSTRAINT "ProjectDoc_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectDoc" ADD CONSTRAINT "ProjectDoc_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
