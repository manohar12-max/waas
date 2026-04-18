import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from '../users/user.schema';

export const GetUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) return null;

    if (data === 'collegeId' && user.role === UserRole.SUPER_ADMIN) {
      const impersonateId = request.headers['x-college-id'];
      if (impersonateId) {
        return impersonateId;
      }
    }

    return data ? user[data] : user;
  },
);
