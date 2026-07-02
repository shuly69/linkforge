import { ForbiddenException, Injectable, Logger } from "@nestjs/common";
import { createHash } from "node:crypto";
import { UAParser } from "ua-parser-js";
import type { BreakdownItem, LinkAnalytics } from "@linkforge/shared";
import { PrismaService } from "../prisma/prisma.service";

export interface ClickContext {
  ip?: string;
  referrer?: string;
  userAgent?: string;
  country?: string;
}

interface DailyRow {
  day: Date;
  clicks: bigint;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records a click. Called from the redirect hot path in a fire-and-forget
   * fashion — analytics must never slow down or fail a redirect, so errors are
   * swallowed and logged rather than propagated.
   */
  async recordClick(linkId: string, ctx: ClickContext): Promise<void> {
    try {
      const device = ctx.userAgent
        ? classifyDevice(ctx.userAgent)
        : "unknown";

      await this.prisma.$transaction([
        this.prisma.click.create({
          data: {
            linkId,
            ipHash: ctx.ip ? hashIp(ctx.ip) : null,
            referrer: normalizeReferrer(ctx.referrer),
            country: ctx.country ?? null,
            device,
            userAgent: ctx.userAgent?.slice(0, 512) ?? null,
          },
        }),
        this.prisma.link.update({
          where: { id: linkId },
          data: { clickCount: { increment: 1 } },
        }),
      ]);
    } catch (err) {
      this.logger.warn(
        `Failed to record click for ${linkId}: ${(err as Error).message}`,
      );
    }
  }

  /** Owner-scoped analytics for a single link over the last `days` days. */
  async getLinkAnalytics(
    ownerId: string,
    linkId: string,
    days: number,
  ): Promise<LinkAnalytics> {
    const link = await this.prisma.link.findUnique({ where: { id: linkId } });
    if (!link || link.ownerId !== ownerId) {
      throw new ForbiddenException("Link not found");
    }

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [totalClicks, uniqueVisitors, daily, referrers, countries, devices] =
      await Promise.all([
        this.prisma.click.count({
          where: { linkId, createdAt: { gte: since } },
        }),
        this.prisma.click
          .findMany({
            where: { linkId, createdAt: { gte: since }, ipHash: { not: null } },
            distinct: ["ipHash"],
            select: { ipHash: true },
          })
          .then((rows) => rows.length),
        this.prisma.$queryRaw<DailyRow[]>`
          SELECT date_trunc('day', "createdAt") AS day, count(*)::bigint AS clicks
          FROM "clicks"
          WHERE "linkId" = ${linkId} AND "createdAt" >= ${since}
          GROUP BY day
          ORDER BY day ASC
        `,
        this.groupBy(linkId, since, "referrer"),
        this.groupBy(linkId, since, "country"),
        this.groupBy(linkId, since, "device"),
      ]);

    return {
      linkId,
      code: link.code,
      totalClicks,
      uniqueVisitors,
      timeSeries: fillTimeSeries(daily, days),
      topReferrers: referrers,
      topCountries: countries,
      byDevice: devices,
    };
  }

  /** Aggregate KPIs for the dashboard header. */
  async getOverview(ownerId: string) {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [totalLinks, agg, clicksLast7d] = await Promise.all([
      this.prisma.link.count({ where: { ownerId } }),
      this.prisma.link.aggregate({
        where: { ownerId },
        _sum: { clickCount: true },
      }),
      this.prisma.click.count({
        where: { link: { ownerId }, createdAt: { gte: since } },
      }),
    ]);

    return {
      totalLinks,
      totalClicks: agg._sum.clickCount ?? 0,
      clicksLast7d,
    };
  }

  private async groupBy(
    linkId: string,
    since: Date,
    field: "referrer" | "country" | "device",
  ): Promise<BreakdownItem[]> {
    const grouped = await this.prisma.click.groupBy({
      by: [field],
      where: { linkId, createdAt: { gte: since } },
      _count: { _all: true },
      orderBy: { _count: { [field]: "desc" } },
      take: 5,
    });

    return grouped.map((row) => ({
      label: (row[field] as string | null) ?? "unknown",
      clicks: row._count._all,
    }));
  }
}

function hashIp(ip: string): string {
  // One-way hash so we can count unique visitors without storing raw IPs.
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

function classifyDevice(userAgent: string): string {
  const result = UAParser(userAgent);
  const type = result.device.type; // mobile | tablet | console | ...
  if (type === "mobile" || type === "tablet") return type;
  if (/bot|crawl|spider/i.test(userAgent)) return "bot";
  return "desktop";
}

function normalizeReferrer(ref?: string): string | null {
  if (!ref) return "direct";
  try {
    return new URL(ref).hostname;
  } catch {
    return ref.slice(0, 128);
  }
}

/** Pads the raw daily rows so the chart always has one point per day. */
function fillTimeSeries(rows: DailyRow[], days: number) {
  const byDay = new Map<string, number>();
  for (const row of rows) {
    byDay.set(row.day.toISOString().slice(0, 10), Number(row.clicks));
  }

  const series: { date: string; clicks: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    series.push({ date: d, clicks: byDay.get(d) ?? 0 });
  }
  return series;
}
