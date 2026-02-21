import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const result = (await super.canActivate(context)) as boolean;
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (user) {
      request.OrganizationId = user.organizationId ?? user.OrganizationId;
      request.deviceId = user.deviceId;
      request.userId = user.sub ?? user.id;
    }
    return result;
  }
}
