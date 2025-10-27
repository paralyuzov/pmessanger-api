import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async searchUser(name: string, excludeUserId: string) {
    const users = await this.prisma.user.findMany({
      where: {
        name: {
          contains: name,
          mode: 'insensitive',
        },
        id: {
          not: excludeUserId,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        status: true,
        friendshipsReceived: { select: { status: true } },
        friendshipsSent: { select: { status: true } },
      },
    });
    return users;
  }

  async updateUserStatusOnLogin(userId: string) {
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
}
