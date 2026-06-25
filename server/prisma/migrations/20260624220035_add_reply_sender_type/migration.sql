/*
  Warnings:

  - Added the required column `senderType` to the `ticket_reply` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ReplySenderType" AS ENUM ('agent', 'customer');

-- DropForeignKey
ALTER TABLE "ticket_reply" DROP CONSTRAINT "ticket_reply_authorId_fkey";

-- AlterTable
ALTER TABLE "ticket_reply" ADD COLUMN     "senderType" "ReplySenderType" NOT NULL,
ALTER COLUMN "authorId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "ticket_reply" ADD CONSTRAINT "ticket_reply_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
