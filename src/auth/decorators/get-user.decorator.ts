import { createParamDecorator, ExecutionContext } from '@nestjs/common';

interface AuthenticationRequest extends Request {
  user: {
    id: string;
    email: string;
    name: string;
    avatar: string;
  };
}

export const GetUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthenticationRequest>();
    return request.user;
  },
);
