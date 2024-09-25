/*
  Warnings:

  - The values [queue,progress,ready,fail] on the enum `DeploymentStatus` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `time` to the `Log` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "DeploymentStatus_new" AS ENUM ('QUEUE', 'PROGRESS', 'READY', 'FAIL');
ALTER TABLE "Deployment" ALTER COLUMN "status" TYPE "DeploymentStatus_new" USING ("status"::text::"DeploymentStatus_new");
ALTER TYPE "DeploymentStatus" RENAME TO "DeploymentStatus_old";
ALTER TYPE "DeploymentStatus_new" RENAME TO "DeploymentStatus";
DROP TYPE "DeploymentStatus_old";
COMMIT;

-- AlterTable
ALTER TABLE "Log" ADD COLUMN     "time" TIMESTAMP(3) NOT NULL;
