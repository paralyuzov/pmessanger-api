import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Message, MessageType } from '@prisma/client';
import { Socket } from 'socket.io';
import { JwtPayload } from 'src/auth/strategy/jwt.strategy';
import { FriendshipService } from 'src/friendship/friendship.service';
import { MessagesService } from 'src/messages/messages.service';
import { RoomsService } from 'src/rooms/rooms.service';
import { UserService } from 'src/user/user.service';

interface SocketWithAuth extends Socket {
  data: {
    userId: string;
  };
}

@Injectable()
export class SocketService {
  private onlineUsers: Map<string, string> = new Map();
  private activeViewers: Map<string, Set<string>> = new Map();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly roomsService: RoomsService,
    private readonly messagesService: MessagesService,
    private readonly userService: UserService,
    private readonly friendshipService: FriendshipService,
  ) {}

  authenticateSocket(socket: SocketWithAuth, next: (err?: any) => void) {
    console.log('Authenticating socket:', socket.handshake.auth);
    const token = socket.handshake.auth?.token as string;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      next();
      socket.data.userId = payload.sub;
    } catch (err) {
      console.log('Socket authentication failed:', err);
      return next(err);
    }
  }

  async handleConnection(socket: SocketWithAuth) {
    const userId = socket.data.userId;
    const socketId = socket.id;
    this.onlineUsers.set(userId, socketId);
    await this.userService.updateUserStatusOnLogin(userId);
    console.log(`Socket connected: ${socket.id}`);
    console.log(`Authenticated user ID: ${socket.data.userId}`);
  }

  async handleDisconnect(socket: SocketWithAuth) {
    const userId = socket.data.userId;
    this.onlineUsers.delete(userId);
    await this.userService.updateUserStatusOnLogout(userId);
    console.log(`Socket disconnected: ${socket.id}`);
  }

  async loadMessages(roomId: string) {
    return await this.messagesService.getRoomMessages(roomId);
  }

  async joinRoom(roomId: string, client: SocketWithAuth) {
    const room = await this.roomsService.isRoomExisting(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    this.activeViewers.set(roomId, new Set<string>([client.data.userId]));

    const friendId = await this.roomsService.getFriendInRoom(
      roomId,
      client.data.userId,
    );
    if (!friendId) {
      throw new Error('Friend not found in room');
    }

    const friendSocketId = this.onlineUsers.get(friendId.id);
    await this.messagesService.markRoomAsRead(roomId, client.data.userId);
    return {
      room,
      friendSocketId,
    };
  }

  async sendMessage(
    roomId: string,
    type: MessageType,
    content: string,
    client: SocketWithAuth,
  ) {
    const message = await this.messagesService.createMessage(
      roomId,
      type,
      content,
      client.data.userId,
    );

    const friendId = await this.roomsService.getFriendInRoom(
      roomId,
      client.data.userId,
    );

    if (!friendId) {
      throw new Error('Friend not found in room');
    }
    const friendSocketId = this.onlineUsers.get(friendId.id);
    if (this.activeViewers.get(roomId)?.has(friendId.id)) {
      console.log('Marking room as read for friend:', friendId.id);
      await this.messagesService.markRoomAsRead(roomId, friendId.id);
    }

    return {
      message,
      friendSocketId,
    };
  }

  async getOlderMessages(room: string, oldestMessageId: string) {
    return await this.messagesService.getOlderMessages(room, oldestMessageId);
  }

  async notifyFriendRequest(friendshipId: string) {
    const friendship =
      await this.friendshipService.getFriendRequestById(friendshipId);
    if (friendship) {
      const recipientSocketId = this.onlineUsers.get(friendship.recipientId)!;
      return { recipientSocketId, friendship };
    }
  }

  async notifyFriendAcceptance(friendshipId: string) {
    const friendship =
      await this.friendshipService.getFriendRequestById(friendshipId);
    if (friendship) {
      const senderSocketId = this.onlineUsers.get(friendship.senderId)!;
      return { senderSocketId, friendship };
    }
  }

  async notifyFriendRejection(friendshipId: string) {
    const friendship =
      await this.friendshipService.getFriendRequestById(friendshipId);
    if (friendship) {
      const senderSocketId = this.onlineUsers.get(friendship.senderId)!;
      return { senderSocketId, friendship };
    }
  }

  leaveRoom(roomId: string, client: SocketWithAuth) {
    console.log(`User ${client.data.userId} is leaving room ${roomId}`);
    const viewers = this.activeViewers.get(roomId);
    console.log(viewers);
    if (viewers) {
      viewers.delete(client.data.userId);
      if (viewers.size === 0) {
        this.activeViewers.delete(roomId);
      }
    }
  }

  async markMessagesAsRead(message: Message, client: SocketWithAuth) {
    await this.messagesService.markRoomAsRead(
      message.roomId,
      client.data.userId,
    );
  }
}
