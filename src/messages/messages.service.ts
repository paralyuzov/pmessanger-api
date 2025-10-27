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
    return this.prisma.message.create({
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

  async getOlderMessages(roomId: string, beforeMessageId?: string) {
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
}
