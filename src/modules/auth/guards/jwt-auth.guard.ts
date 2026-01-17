import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const result = (await super.canActivate(context)) as boolean;
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (user) {
      request.userId = user.sub ?? user.id;
      request.workspaceId = user.workspaceId;
      request.deviceId = user.deviceId;
    }
    return result;
  }
}
