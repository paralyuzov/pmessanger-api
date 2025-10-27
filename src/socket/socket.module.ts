import { Module } from '@nestjs/common';
import { SocketService } from './socket.service';
import { SocketGateway } from './socket.gateway';
import { JwtService } from '@nestjs/jwt';
import { RoomsModule } from 'src/rooms/rooms.module';
import { MessagesModule } from 'src/messages/messages.module';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [RoomsModule, MessagesModule, UserModule],
  providers: [SocketGateway, SocketService, JwtService],
})
export class SocketModule {}
