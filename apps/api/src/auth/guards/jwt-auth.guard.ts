import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/** Requires a valid access token. Attach with `@UseGuards(JwtAuthGuard)`. */
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}
