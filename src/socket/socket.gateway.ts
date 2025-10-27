import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { SocketService } from './socket.service';
import { Server, Socket } from 'socket.io';
import { MessageType } from '@prisma/client';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class SocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;
  constructor(private readonly socketService: SocketService) {}

  afterInit(server: Server) {
    server.use((socket: Socket, next) => {
      this.socketService.authenticateSocket(socket, next);
      next();
    });
  }
  async handleConnection(client: Socket) {
    await this.socketService.handleConnection(client);
  }
  async handleDisconnect(client: Socket) {
    await this.socketService.handleDisconnect(client);
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @MessageBody() friendId: string,
    @ConnectedSocket() client: Socket,
  ) {
    const room = await this.socketService.joinRoom(client, friendId);
    await client.join(room.id);
    console.log(`Client ${client.id} joined room ${room.id}`);
  }

  @SubscribeMessage('loadMessages')
  async handleLoadMessages(
    @MessageBody() roomId: string,
    @ConnectedSocket() client: Socket,
  ) {
    const messages = await this.socketService.loadMessages(roomId);
    this.server.to(client.id).emit('messagesLoaded', messages);
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() data: { room: string; type: MessageType; content: string },
    @ConnectedSocket() client: Socket,
  ) {
    const message = await this.socketService.sendMessage(
      data.room,
      data.type,
      data.content,
      client,
    );
    console.log(message);
    this.server.to(data.room).emit('receivedMessage', message);
  }

  @SubscribeMessage('loadOlderMessages')
  async handleLoadOlderMessages(
    @MessageBody() data: { roomId: string; oldestMessageId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const olderMessages = await this.socketService.getOlderMessages(
      data.roomId,
      data.oldestMessageId,
    );
    this.server.to(client.id).emit('olderMessagesLoaded', olderMessages);
  }
}
