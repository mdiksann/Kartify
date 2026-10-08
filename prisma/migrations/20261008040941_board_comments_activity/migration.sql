/*
  Warnings:

  - A unique constraint covering the columns `[projectId,position]` on the table `Column` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[columnId,position]` on the table `Task` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('TASK_CREATED', 'TASK_UPDATED', 'TASK_MOVED', 'TASK_ASSIGNED', 'TASK_PRIORITY_CHANGED', 'TASK_DUE_DATE_CHANGED', 'COMMENT_ADDED', 'COMMENT_UPDATED', 'COMMENT_DELETED');

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Comment_taskId_createdAt_id_idx" ON "Comment"("taskId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "Activity_taskId_createdAt_id_idx" ON "Activity"("taskId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Column_projectId_position_key" ON "Column"("projectId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Task_columnId_position_key" ON "Task"("columnId", "position");

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
