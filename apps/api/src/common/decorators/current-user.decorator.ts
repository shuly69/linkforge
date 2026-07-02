import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { JwtPayload } from "@linkforge/shared";

/**
 * Injects the authenticated user (JWT payload) attached by JwtStrategy.
 * Usage: `@CurrentUser() user: JwtPayload`.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as JwtPayload;
  },
);
