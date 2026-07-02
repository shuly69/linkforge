import {
  Controller,
  Get,
  GoneException,
  NotFoundException,
  Param,
  Redirect,
  Req,
  Version,
  VERSION_NEUTRAL,
} from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import type { Request } from "express";
import { LinksService } from "../links/links.service";
import { AnalyticsService } from "../analytics/analytics.service";

/**
 * The public redirect endpoint: GET /:code → 302 to the target URL.
 * Deliberately unauthenticated, off the /api prefix, and version-neutral so
 * the short URL stays clean (e.g. https://host/abc123).
 */
@ApiExcludeController()
@Controller()
export class RedirectController {
  constructor(
    private readonly links: LinksService,
    private readonly analytics: AnalyticsService,
  ) {}

  @Get(":code")
  @Version(VERSION_NEUTRAL)
  @Redirect()
  async redirect(@Param("code") code: string, @Req() req: Request) {
    const link = await this.links.resolve(code);
    if (!link || !link.isActive) {
      throw new NotFoundException("Short link not found");
    }
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      throw new GoneException("Short link has expired");
    }

    // Fire-and-forget: never block the redirect on analytics.
    void this.analytics.recordClick(link.id, {
      ip: clientIp(req),
      referrer: req.get("referer") ?? undefined,
      userAgent: req.get("user-agent") ?? undefined,
      // A real deployment would resolve country from a GeoIP lookup or the
      // CDN's geo header; we read the common Cloudflare header if present.
      country: req.get("cf-ipcountry") ?? undefined,
    });

    return { url: link.url, statusCode: 302 };
  }
}

function clientIp(req: Request): string | undefined {
  const forwarded = req.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.ip;
}
