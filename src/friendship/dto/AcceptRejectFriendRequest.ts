import { IsString, IsUUID } from 'class-validator';

export class AcceptRejectFriendRequestDto {
  @IsUUID()
  @IsString()
  friendshipId: string;
}
