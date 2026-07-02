/**
 * Seed script — creates a demo admin, a demo user and a handful of links with
 * synthetic click history so the analytics dashboard has something to show.
 *
 * Run with: pnpm --filter @linkforge/api prisma:seed
 */
import { PrismaClient, Role } from "@prisma/client";
import * as argon2 from "argon2";
import { customAlphabet } from "nanoid";

const prisma = new PrismaClient();
const nano = customAlphabet(
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
  7,
);

const DEVICES = ["desktop", "mobile", "tablet"];
const COUNTRIES = ["IE", "GB", "US", "DE", "FR", "UA"];
const REFERRERS = [
  "https://twitter.com",
  "https://news.ycombinator.com",
  "https://google.com",
  "direct",
];

function randomOf<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  const password = await argon2.hash("Password123!");

  const admin = await prisma.user.upsert({
    where: { email: "admin@linkforge.dev" },
    update: {},
    create: {
      email: "admin@linkforge.dev",
      passwordHash: password,
      name: "Admin",
      role: Role.ADMIN,
    },
  });

  const user = await prisma.user.upsert({
    where: { email: "demo@linkforge.dev" },
    update: {},
    create: {
      email: "demo@linkforge.dev",
      passwordHash: password,
      name: "Demo User",
      role: Role.USER,
    },
  });

  const targets = [
    "https://nestjs.com",
    "https://nextjs.org",
    "https://www.prisma.io",
    "https://tanstack.com/query/latest",
  ];

  for (const [i, url] of targets.entries()) {
    const code = i === 0 ? "welcome" : nano();
    const link = await prisma.link.upsert({
      where: { code },
      update: {},
      create: { code, url, ownerId: i % 2 === 0 ? user.id : admin.id },
    });

    // Generate 30 days of random clicks.
    const clicks = [];
    const now = Date.now();
    const total = 20 + Math.floor(Math.random() * 200);
    for (let c = 0; c < total; c++) {
      const daysAgo = Math.floor(Math.random() * 30);
      clicks.push({
        linkId: link.id,
        ipHash: nano(),
        referrer: randomOf(REFERRERS),
        country: randomOf(COUNTRIES),
        device: randomOf(DEVICES),
        userAgent: "seed",
        createdAt: new Date(now - daysAgo * 24 * 60 * 60 * 1000),
      });
    }
    await prisma.click.createMany({ data: clicks });
    await prisma.link.update({
      where: { id: link.id },
      data: { clickCount: total },
    });
  }

  console.log("Seed complete.");
  console.log("  admin@linkforge.dev / Password123!  (ADMIN)");
  console.log("  demo@linkforge.dev  / Password123!  (USER)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
