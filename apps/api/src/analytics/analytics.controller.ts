import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  analyticsRangeSchema,
  type AnalyticsRangeQuery,
  type JwtPayload,
} from "@linkforge/shared";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AnalyticsService } from "./analytics.service";

@ApiTags("analytics")
@ApiBearerAuth()
@Controller("analytics")
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get("overview")
  @ApiOperation({ summary: "Dashboard KPIs for the current user" })
  overview(@CurrentUser() user: JwtPayload) {
    return this.analytics.getOverview(user.sub);
  }

  @Get("links/:id")
  @ApiOperation({ summary: "Time-series and breakdowns for one link" })
  linkAnalytics(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Query(new ZodValidationPipe(analyticsRangeSchema))
    query: AnalyticsRangeQuery,
  ) {
    return this.analytics.getLinkAnalytics(user.sub, id, query.days);
  }
}
