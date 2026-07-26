-- AlterTable
ALTER TABLE "ticket_reply" ADD COLUMN     "messageId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ticket_reply_messageId_key" ON "ticket_reply"("messageId");
