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
    @MessageBody() roomId: string,
    @ConnectedSocket() client: Socket,
  ) {
    const { room, friendSocketId } = await this.socketService.joinRoom(
      roomId,
      client,
    );
    await client.join(room.id);
    console.log(`Client ${client.id} joined room ${room.id}`);
    this.server.to(client.id).emit('joinedRoom', room.id);
    this.server.to(friendSocketId!).emit('friendJoinedRoom', room.id);
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
    const { message, friendSocketId } = await this.socketService.sendMessage(
      data.room,
      data.type,
      data.content,
      client,
    );
    this.server.to(data.room).emit('receivedMessage', message);
    this.server.to(friendSocketId!).emit('newMessageNotification', {
      roomId: data.room,
    });
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

  @SubscribeMessage('sendFriendRequest')
  async handleSendFriendRequest(@MessageBody() friendshipId: string) {
    const friendshipData =
      await this.socketService.notifyFriendRequest(friendshipId);
    if (friendshipData) {
      console.log(friendshipData);
      this.server
        .to(friendshipData.recipientSocketId)
        .emit('newFriendRequest', friendshipData.friendship);
      console.log(
        `Notified socket ${friendshipData.recipientSocketId} of new friend request ${friendshipId}`,
      );
    }
  }
  @SubscribeMessage('acceptFriendRequest')
  async handleAcceptFriendRequest(@MessageBody() friendshipId: string) {
    const friendshipData =
      await this.socketService.notifyFriendAcceptance(friendshipId);
    if (friendshipData) {
      this.server
        .to(friendshipData.senderSocketId)
        .emit('friendRequestAccepted', friendshipData.friendship);
      console.log(
        `Notified socket ${friendshipData.senderSocketId} of accepted friend request ${friendshipId}`,
      );
    }
  }

  @SubscribeMessage('rejectFriendRequest')
  async handleRejectFriendRequest(@MessageBody() friendshipId: string) {
    const friendshipData =
      await this.socketService.notifyFriendRejection(friendshipId);
    if (friendshipData) {
      this.server
        .to(friendshipData.senderSocketId)
        .emit('friendRequestRejected', friendshipData.friendship);
      console.log(
        `Notified socket ${friendshipData.senderSocketId} of rejected friend request ${friendshipId}`,
      );
    }
  }
}
