/*
  Warnings:

  - A unique constraint covering the columns `[lastMessageId]` on the table `Room` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "lastMessageId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Room_lastMessageId_key" ON "Room"("lastMessageId");

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_lastMessageId_fkey" FOREIGN KEY ("lastMessageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;
