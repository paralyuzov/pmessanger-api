import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async createRoom(userId: string, friendId: string, name?: string) {
    const existingRoom = await this.isRoomExisting(userId, friendId);
    if (existingRoom) {
      console.log('Room already exists between', userId, 'and', friendId);
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

  private async isRoomExisting(userId: string, friendId: string) {
    const room = await this.prisma.room.findFirst({
      where: {
        isGroup: false,
        AND: [
          { participants: { some: { userId: userId } } },
          { participants: { some: { userId: friendId } } },
        ],
      },
    });
    return room;
  }
}
