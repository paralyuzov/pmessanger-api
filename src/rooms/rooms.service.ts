import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async createRoom(userId: string, friendId: string, name?: string) {
    console.log('Creating room between', userId, 'and', friendId);
    const existingRoom = await this.prisma.room.findFirst({
      where: {
        isGroup: false,
        AND: [
          {
            participants: {
              some: { userId: userId },
            },
          },
          {
            participants: {
              some: { userId: friendId },
            },
          },
        ],
      },
      include: {
        participants: true,
      },
    });

    if (existingRoom) {
      return existingRoom;
    }
    return this.prisma.room.create({
      data: {
        name: name || null,
        isGroup: false,
        participants: {
          create: [
            { user: { connect: { id: userId } } },
            { user: { connect: { id: friendId } } },
          ],
        },
      },
      include: {
        participants: {
          include: { user: true },
        },
      },
    });
  }

  async getUserRooms(userId: string) {
    const rooms = await this.prisma.room.findMany({
      where: {
        participants: {
          some: { userId: userId },
        },
      },
      include: {
        participants: {
          include: { user: true },
        },
      },
    });

    const mappedRooms = rooms.map((room) => ({
      ...room,
      participants: room.participants.filter((p) => p.userId !== userId),
    }));
    return mappedRooms;
  }

  async isRoomExisting(roomId: string) {
    return this.prisma.room.findUnique({
      where: { id: roomId },
      include: {
        participants: {
          include: { user: true },
        },
      },
    });
  }

  async getFriendInRoom(roomId: string, userId: string) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: {
        participants: true,
      },
    });

    if (!room) {
      throw new Error('Room not found');
    }

    const friendParticipant = room.participants.find(
      (p) => p.userId !== userId,
    );

    if (!friendParticipant) {
      throw new Error('Friend not found in room');
    }

    return this.prisma.user.findUnique({
      where: { id: friendParticipant.userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        status: true,
      },
    });
  }
}
