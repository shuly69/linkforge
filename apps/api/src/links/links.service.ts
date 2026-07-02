import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Link as LinkModel, Prisma } from "@prisma/client";
import { customAlphabet } from "nanoid";
import type {
  CreateLinkDto,
  Link,
  ListLinksQuery,
  Paginated,
  UpdateLinkDto,
} from "@linkforge/shared";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import type { AppConfig } from "../config/configuration";

/** url-safe, unambiguous alphabet (no look-alikes) for generated codes. */
const generateCode = customAlphabet(
  "23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ",
  7,
);

const CACHE_TTL_SECONDS = 60 * 10; // 10 minutes
const cacheKey = (code: string) => `link:${code}`;

/** Minimal shape cached in Redis for the hot redirect path. */
export interface ResolvedLink {
  id: string;
  url: string;
  isActive: boolean;
  expiresAt: string | null;
}

@Injectable()
export class LinksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async create(ownerId: string, dto: CreateLinkDto): Promise<Link> {
    const code = dto.customAlias ?? (await this.uniqueCode());

    if (dto.customAlias) {
      const clash = await this.prisma.link.findUnique({ where: { code } });
      if (clash) throw new ConflictException("Alias already taken");
    }

    const link = await this.prisma.link.create({
      data: {
        code,
        url: dto.url,
        ownerId,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });
    return this.toDto(link);
  }

  async list(
    ownerId: string,
    query: ListLinksQuery,
  ): Promise<Paginated<Link>> {
    const where: Prisma.LinkWhereInput = {
      ownerId,
      ...(query.search
        ? {
            OR: [
              { code: { contains: query.search, mode: "insensitive" } },
              { url: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.link.count({ where }),
      this.prisma.link.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return {
      items: items.map((l) => this.toDto(l)),
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    };
  }

  async findOneOwned(ownerId: string, id: string): Promise<Link> {
    const link = await this.getOwnedOrThrow(ownerId, id);
    return this.toDto(link);
  }

  async update(
    ownerId: string,
    id: string,
    dto: UpdateLinkDto,
  ): Promise<Link> {
    const link = await this.getOwnedOrThrow(ownerId, id);

    const updated = await this.prisma.link.update({
      where: { id },
      data: {
        url: dto.url ?? undefined,
        isActive: dto.isActive ?? undefined,
        expiresAt:
          dto.expiresAt === undefined
            ? undefined
            : dto.expiresAt === null
              ? null
              : new Date(dto.expiresAt),
      },
    });

    await this.redis.del(cacheKey(link.code));
    return this.toDto(updated);
  }

  async remove(ownerId: string, id: string): Promise<void> {
    const link = await this.getOwnedOrThrow(ownerId, id);
    await this.prisma.link.delete({ where: { id } });
    await this.redis.del(cacheKey(link.code));
  }

  /**
   * Read-through cache used by the redirect controller. This is the hottest
   * path in the app, so it avoids Postgres on a cache hit.
   */
  async resolve(code: string): Promise<ResolvedLink | null> {
    const cached = await this.redis.getJson<ResolvedLink>(cacheKey(code));
    if (cached) return cached;

    const link = await this.prisma.link.findUnique({ where: { code } });
    if (!link) return null;

    const resolved: ResolvedLink = {
      id: link.id,
      url: link.url,
      isActive: link.isActive,
      expiresAt: link.expiresAt?.toISOString() ?? null,
    };
    await this.redis.setJson(cacheKey(code), resolved, CACHE_TTL_SECONDS);
    return resolved;
  }

  private async getOwnedOrThrow(
    ownerId: string,
    id: string,
  ): Promise<LinkModel> {
    const link = await this.prisma.link.findUnique({ where: { id } });
    if (!link) throw new NotFoundException("Link not found");
    if (link.ownerId !== ownerId) {
      throw new ForbiddenException("You do not own this link");
    }
    return link;
  }

  private async uniqueCode(): Promise<string> {
    // Collisions are astronomically unlikely with a 7-char alphabet, but a
    // bounded retry keeps the guarantee absolute.
    for (let i = 0; i < 5; i++) {
      const code = generateCode();
      const existing = await this.prisma.link.findUnique({ where: { code } });
      if (!existing) return code;
    }
    throw new ConflictException("Could not allocate a unique code");
  }

  private toDto(link: LinkModel): Link {
    const base = this.config.get("shortLinkBaseUrl", { infer: true });
    return {
      id: link.id,
      code: link.code,
      url: link.url,
      shortUrl: `${base}/${link.code}`,
      clickCount: link.clickCount,
      isActive: link.isActive,
      expiresAt: link.expiresAt?.toISOString() ?? null,
      createdAt: link.createdAt.toISOString(),
      updatedAt: link.updatedAt.toISOString(),
    };
  }
}
