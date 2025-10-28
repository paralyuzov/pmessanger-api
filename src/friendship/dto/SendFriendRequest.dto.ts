import { IsString, IsUUID } from 'class-validator';

export class SendFriendRequestDto {
  @IsUUID()
  @IsString()
  recipientId: string;
}
