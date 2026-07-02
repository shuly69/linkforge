import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  createLinkSchema,
  listLinksQuerySchema,
  updateLinkSchema,
  type CreateLinkDto,
  type JwtPayload,
  type ListLinksQuery,
  type UpdateLinkDto,
} from "@linkforge/shared";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { LinksService } from "./links.service";

@ApiTags("links")
@ApiBearerAuth()
@Controller("links")
@UseGuards(JwtAuthGuard)
export class LinksController {
  constructor(private readonly links: LinksService) {}

  @Post()
  @ApiOperation({ summary: "Create a short link" })
  create(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createLinkSchema)) dto: CreateLinkDto,
  ) {
    return this.links.create(user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: "List the caller's links (paginated)" })
  list(
    @CurrentUser() user: JwtPayload,
    @Query(new ZodValidationPipe(listLinksQuerySchema)) query: ListLinksQuery,
  ) {
    return this.links.list(user.sub, query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get one of the caller's links" })
  findOne(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.links.findOneOwned(user.sub, id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a link (owner only)" })
  update(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateLinkSchema)) dto: UpdateLinkDto,
  ) {
    return this.links.update(user.sub, id, dto);
  }

  @Delete(":id")
  @HttpCode(204)
  @ApiOperation({ summary: "Delete a link (owner only)" })
  remove(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.links.remove(user.sub, id);
  }
}
