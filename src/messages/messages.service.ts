import { Injectable } from '@nestjs/common';
import { MessageType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async createMessage(
    roomId: string,
    type: MessageType,
    content: string,
    senderId: string,
  ) {
    const message = await this.prisma.message.create({
      data: {
        roomId,
        type,
        content,
        senderId,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    await this.prisma.room.update({
      where: { id: roomId },
      data: { lastActivity: message.createdAt },
    });

    await this.prisma.roomParticipant.updateMany({
      where: {
        roomId,
        userId: { not: senderId },
      },
      data: {
        unreadCount: { increment: 1 },
      },
    });

    return message;
  }

  async getRoomMessages(roomId: string) {
    const messages = await this.prisma.message.findMany({
      where: { roomId },
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      take: 20,
    });
    return messages.reverse();
  }

  async getOlderMessages(roomId: string, beforeMessageId: string) {
    let createdAtCursor: Date | undefined;
    if (beforeMessageId) {
      const beforeMessage = await this.prisma.message.findUnique({
        where: { id: beforeMessageId },
        select: { createdAt: true },
      });

      if (!beforeMessage) {
        return [];
      }

      createdAtCursor = beforeMessage.createdAt;
    }

    const messages = await this.prisma.message.findMany({
      where: {
        roomId,
        ...(createdAtCursor && { createdAt: { lt: createdAtCursor } }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: { id: true, name: true, avatar: true },
        },
      },
      take: 20,
    });

    return messages.reverse();
  }

  async markRoomAsRead(roomId: string, userId: string) {
    const latestMessage = await this.prisma.message.findFirst({
      where: { roomId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    await this.prisma.roomParticipant.updateMany({
      where: { roomId, userId },
      data: {
        lastReadAt: latestMessage?.createdAt || new Date(),
        unreadCount: 0,
      },
    });
  }

  async getAllUnreadCounts(userId: string) {
    const roomParticipants = await this.prisma.roomParticipant.findMany({
      where: { userId },
      select: { roomId: true, unreadCount: true },
    });

    const unreadCounts: Record<string, number> = {};
    roomParticipants.forEach(
      (participant: { roomId: string; unreadCount: number }) => {
        unreadCounts[participant.roomId] = participant.unreadCount;
      },
    );

    return unreadCounts;
  }
}
