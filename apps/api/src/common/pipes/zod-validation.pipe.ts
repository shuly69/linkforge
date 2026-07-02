import { BadRequestException, PipeTransform } from "@nestjs/common";
import { ZodSchema } from "zod";

/**
 * Bridges the shared Zod schemas (@linkforge/shared) into Nest's pipe system.
 * Usage: `@Body(new ZodValidationPipe(createLinkSchema)) dto: CreateLinkDto`.
 *
 * This is what lets the server enforce exactly the same rules the browser
 * validated with — one schema, two runtimes.
 */
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: result.error.issues.map(
          (i) => `${i.path.join(".") || "value"}: ${i.message}`,
        ),
        error: "Validation failed",
      });
    }
    return result.data;
  }
}
