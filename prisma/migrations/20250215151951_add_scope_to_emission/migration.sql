/*
  Warnings:

  - Added the required column `scope` to the `Emission` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Emission" ADD COLUMN     "scope" "EmissionScope" NOT NULL;

-- AlterTable
ALTER TABLE "Worker" ADD COLUMN     "name" TEXT;
