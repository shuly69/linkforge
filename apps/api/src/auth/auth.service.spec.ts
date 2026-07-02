import { ConflictException, UnauthorizedException } from "@nestjs/common";
import * as argon2 from "argon2";
import { AuthService } from "./auth.service";

/**
 * Unit test — the service is exercised with hand-rolled fakes for its three
 * collaborators (Prisma, JwtService, ConfigService). No database or network.
 */
describe("AuthService", () => {
  const config = {
    get: (key: string) =>
      ({
        "jwt.accessSecret": "access-secret",
        "jwt.refreshSecret": "refresh-secret",
        "jwt.accessTtl": 900,
        "jwt.refreshTtl": 604800,
      })[key],
  };
  const jwt = { signAsync: jest.fn(async () => "signed.jwt.token") };

  function makeService(prisma: unknown) {
    return new AuthService(prisma as never, jwt as never, config as never);
  }

  it("rejects registration when the email already exists", async () => {
    const prisma = { user: { findUnique: jest.fn(async () => ({ id: "1" })) } };
    const service = makeService(prisma);

    await expect(
      service.register({ email: "taken@x.com", password: "password123" }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("issues tokens on successful registration", async () => {
    const prisma = {
      user: {
        findUnique: jest.fn(async () => null),
        create: jest.fn(async () => ({
          id: "u1",
          email: "new@x.com",
          name: null,
          role: "USER",
        })),
      },
    };
    const service = makeService(prisma);

    const result = await service.register({
      email: "new@x.com",
      password: "password123",
    });

    expect(result.accessToken).toBe("signed.jwt.token");
    expect(result.user.email).toBe("new@x.com");
    expect(prisma.user.create).toHaveBeenCalledTimes(1);
  });

  it("rejects login with the wrong password", async () => {
    const hash = await argon2.hash("correct-password");
    const prisma = {
      user: {
        findUnique: jest.fn(async () => ({
          id: "u1",
          email: "a@x.com",
          name: null,
          role: "USER",
          passwordHash: hash,
        })),
      },
    };
    const service = makeService(prisma);

    await expect(
      service.login({ email: "a@x.com", password: "wrong-password" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
