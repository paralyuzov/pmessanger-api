import { Controller, Get, UseGuards } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/guards/jwt-guard.guard';

@UseGuards(JwtAuthGuard)
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get('my-rooms')
  getMyRooms(@GetUser() user: User) {
    return this.roomsService.getUserRooms(user.id);
  }
}
