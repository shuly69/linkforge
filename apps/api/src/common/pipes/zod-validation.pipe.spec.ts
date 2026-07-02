import { BadRequestException } from "@nestjs/common";
import { createLinkSchema } from "@linkforge/shared";
import { ZodValidationPipe } from "./zod-validation.pipe";

describe("ZodValidationPipe", () => {
  const pipe = new ZodValidationPipe(createLinkSchema);

  it("passes and returns typed data for a valid payload", () => {
    const result = pipe.transform({ url: "https://example.com" });
    expect(result.url).toBe("https://example.com");
  });

  it("throws BadRequestException for an invalid URL", () => {
    expect(() => pipe.transform({ url: "not-a-url" })).toThrow(
      BadRequestException,
    );
  });

  it("rejects an alias with illegal characters", () => {
    expect(() =>
      pipe.transform({ url: "https://example.com", customAlias: "bad alias!" }),
    ).toThrow(BadRequestException);
  });
});
