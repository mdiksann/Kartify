-- CreateEnum
CREATE TYPE "WorkspaceBackground" AS ENUM ('blue', 'white', 'mint', 'lavender', 'peach', 'sand');

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "background" "WorkspaceBackground" NOT NULL DEFAULT 'blue';

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "startDate" DATE;

