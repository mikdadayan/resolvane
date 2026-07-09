-- AlterEnum
ALTER TYPE "TicketStatus" ADD VALUE 'new';
ALTER TYPE "TicketStatus" ADD VALUE 'processing';

-- AlterTable
ALTER TABLE "ticket" ALTER COLUMN "status" SET DEFAULT 'new';
