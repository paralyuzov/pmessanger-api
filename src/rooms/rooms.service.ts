import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

type RoomParticipant = {
  id: string;
  userId: string;
  roomId: string;
  lastReadAt: Date | null;
  unreadCount: number;
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    status: {
      id: string;
      userId: string;
      isOnline: boolean;
      lastActive: Date | null;
    } | null;
  };
};

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async createRoom(userId: string, friendId: string, name?: string) {
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
        lastMessage: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
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
        lastMessage: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
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
        lastMessage: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: {
        lastActivity: 'desc',
      },
    });

    return rooms.map((room) => {
      const participants = room.participants as RoomParticipant[];
      const filteredParticipants = participants.filter(
        (participant) => participant.userId !== userId,
      );

      return {
        ...room,
        participants: filteredParticipants,
      };
    });
  }

  async isRoomExisting(roomId: string) {
    return this.prisma.room.findUnique({
      where: { id: roomId },
      include: {
        lastMessage: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
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
