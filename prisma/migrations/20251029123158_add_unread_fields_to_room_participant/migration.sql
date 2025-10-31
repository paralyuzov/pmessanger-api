-- AlterTable
ALTER TABLE "RoomParticipant" ADD COLUMN     "lastReadAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "unreadCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "RoomParticipant_userId_unreadCount_idx" ON "RoomParticipant"("userId", "unreadCount");

-- CreateIndex
CREATE INDEX "RoomParticipant_roomId_userId_idx" ON "RoomParticipant"("roomId", "userId");
