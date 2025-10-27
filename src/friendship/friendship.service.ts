import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class FriendshipService {
  constructor(private readonly prisma: PrismaService) {}

  async sendFriendRequest(userId: string, friendId: string) {
    return this.prisma.friendship.create({
      data: {
        senderId: userId,
        recipientId: friendId,
        status: 'PENDING',
      },
    });
  }

  async acceptFriendRequest(friendshipId: string) {
    return this.prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: 'ACCEPTED' },
    });
  }

  async rejectFriendRequest(friendshipId: string) {
    return this.prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: 'REJECTED' },
    });
  }

  async getFriends(userId: string) {
    const friendships = await this.prisma.friendship.findMany({
      where: {
        OR: [
          { senderId: userId, status: 'ACCEPTED' },
          { recipientId: userId, status: 'ACCEPTED' },
        ],
      },
      select: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            nickname: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        recipient: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            nickname: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        senderId: true,
        recipientId: true,
      },
    });

    const mapped = friendships.map((friendship) => {
      if (friendship.senderId === userId) {
        return friendship.recipient;
      } else {
        return friendship.sender;
      }
    });
    return mapped;
  }
}
