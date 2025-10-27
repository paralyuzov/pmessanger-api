import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { MessageType } from '@prisma/client';
import { Socket } from 'socket.io';
import { JwtPayload } from 'src/auth/strategy/jwt.strategy';
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

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly roomsService: RoomsService,
    private readonly messagesService: MessagesService,
    private readonly userService: UserService,
  ) {}

  authenticateSocket(socket: SocketWithAuth, next: (err?: any) => void) {
    console.log('Authenticating socket:', socket.handshake.auth);
    const token = socket.handshake.auth?.token as string;
    if (!token) {
      return socket.disconnect(true);
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
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

  async joinRoom(client: SocketWithAuth, friendId: string) {
    const room = await this.roomsService.createRoom(
      client.data.userId,
      friendId,
    );
    return room;
  }

  async loadMessages(roomId: string) {
    return await this.messagesService.getRoomMessages(roomId);
  }

  async sendMessage(
    roomId: string,
    type: MessageType,
    content: string,
    client: SocketWithAuth,
  ) {
    return await this.messagesService.createMessage(
      roomId,
      type,
      content,
      client.data.userId,
    );
  }

  async getOlderMessages(roomId: string, beforeMessageId?: string) {
    return await this.messagesService.getOlderMessages(roomId, beforeMessageId);
  }
}
