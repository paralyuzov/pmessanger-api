import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async searchUser(name: string, currentUserId: string) {
    const users = await this.prisma.user.findMany({
      where: {
        name: {
          contains: name,
          mode: 'insensitive',
        },
        id: { not: currentUserId },
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        status: true,
        friendshipsSent: {
          where: { recipientId: currentUserId },
          select: { status: true },
        },
        friendshipsReceived: {
          where: { senderId: currentUserId },
          select: { status: true },
        },
      },
    });

    return users.map((user) => {
      const sent = user.friendshipsReceived[0]?.status;
      const received = user.friendshipsSent[0]?.status;
      const friendshipStatus = sent || received || 'NONE';

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        status: user.status,
        friendshipStatus,
      };
    });
  }

  async updateUserStatusOnLogin(userId: string) {
    console.log('Updating user status on login for userId:', userId);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existingStatus = await this.prisma.userStatus.findUnique({
      where: { userId: userId },
    });

    if (existingStatus) {
      return this.prisma.userStatus.update({
        where: { userId: userId },
        data: { isOnline: true },
      });
    }

    return this.prisma.userStatus.create({
      data: {
        user: { connect: { id: userId } },
        isOnline: true,
        lastActive: new Date(),
      },
    });
  }

  async updateUserStatusOnLogout(userId: string) {
    return this.prisma.userStatus.update({
      where: { userId: userId },
      data: { isOnline: false, lastActive: new Date() },
    });
  }

  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        status: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
