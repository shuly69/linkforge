import { INestApplication, VersioningType } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

/**
 * End-to-end coverage of the core value path: register → create link →
 * public redirect → analytics reflects the click. Runs against the real
 * Postgres + Redis configured in the environment (docker compose infra / CI
 * services). Uses a unique email + alias per run so it never collides.
 */
describe("LinkForge (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const stamp = Date.now();
  const email = `e2e_${stamp}@test.dev`;
  const alias = `e2e${stamp}`;
  const target = "https://example.com/e2e/destination";

  let token: string;
  let linkId: string;
  let userId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    // Mirror main.ts so route shapes match production (/v1/*, neutral redirect).
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    // Cascade-deletes the user's links and clicks.
    if (userId) {
      await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
    }
    await app.close();
  });

  it("registers a new user and returns tokens", async () => {
    const res = await request(app.getHttpServer())
      .post("/v1/auth/register")
      .send({ email, password: "password123", name: "E2E" })
      .expect(201);

    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.email).toBe(email);
    expect(res.body.user.role).toBe("USER");
    token = res.body.accessToken;
    userId = res.body.user.id;
  });

  it("rejects an invalid URL with 400", async () => {
    const res = await request(app.getHttpServer())
      .post("/v1/links")
      .set("Authorization", `Bearer ${token}`)
      .send({ url: "not-a-url" })
      .expect(400);
    expect(Array.isArray(res.body.message)).toBe(true);
  });

  it("creates a short link with a custom alias", async () => {
    const res = await request(app.getHttpServer())
      .post("/v1/links")
      .set("Authorization", `Bearer ${token}`)
      .send({ url: target, customAlias: alias })
      .expect(201);

    expect(res.body.code).toBe(alias);
    expect(res.body.shortUrl).toContain(alias);
    linkId = res.body.id;
  });

  it("rejects a duplicate alias with 409", async () => {
    await request(app.getHttpServer())
      .post("/v1/links")
      .set("Authorization", `Bearer ${token}`)
      .send({ url: "https://other.example", customAlias: alias })
      .expect(409);
  });

  it("redirects the public short link (302) to the target", async () => {
    const res = await request(app.getHttpServer())
      .get(`/${alias}`)
      .expect(302);
    expect(res.headers.location).toBe(target);
  });

  it("records the click in analytics (fire-and-forget)", async () => {
    // recordClick is not awaited by the redirect, so poll until it lands.
    let total = 0;
    for (let i = 0; i < 20 && total < 1; i++) {
      const res = await request(app.getHttpServer())
        .get(`/v1/analytics/links/${linkId}?days=7`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      total = res.body.totalClicks;
      if (total < 1) await new Promise((r) => setTimeout(r, 150));
    }
    expect(total).toBeGreaterThanOrEqual(1);
  });

  it("blocks a non-admin from the admin-only users route (403)", async () => {
    await request(app.getHttpServer())
      .get("/v1/users")
      .set("Authorization", `Bearer ${token}`)
      .expect(403);
  });

  it("rejects unauthenticated access with 401", async () => {
    await request(app.getHttpServer()).get("/v1/links").expect(401);
  });
});
