import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { FriendshipService } from './friendship.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-guard.guard';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from '@prisma/client';
import { SendFriendRequestDto } from './dto/SendFriendRequest.dto';
import { AcceptRejectFriendRequestDto } from './dto/AcceptRejectFriendRequest';

@UseGuards(JwtAuthGuard)
@Controller('friendship')
export class FriendshipController {
  constructor(private readonly friendshipService: FriendshipService) {}

  @Post('send-request')
  async sendFriendRequest(
    @GetUser() user: User,
    @Body() sendFriendRequestDto: SendFriendRequestDto,
  ) {
    return await this.friendshipService.sendFriendRequest(
      user.id,
      sendFriendRequestDto.recipientId,
    );
  }

  @Post('accept-request')
  async acceptFriendRequest(
    @Body() acceptRejectFriendRequestDto: AcceptRejectFriendRequestDto,
  ) {
    return await this.friendshipService.acceptFriendRequest(
      acceptRejectFriendRequestDto.friendshipId,
    );
  }

  @Post('reject-request')
  async rejectFriendRequest(
    @Body() acceptRejectFriendRequestDto: AcceptRejectFriendRequestDto,
  ) {
    return await this.friendshipService.rejectFriendRequest(
      acceptRejectFriendRequestDto.friendshipId,
    );
  }

  @Get('friends')
  async getFriends(@GetUser() user: User) {
    return await this.friendshipService.getFriends(user.id);
  }

  @Get('pending-requests')
  async getPendingFriendRequests(@GetUser() user: User) {
    return await this.friendshipService.getPendingFriendRequests(user.id);
  }
}
