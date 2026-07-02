/**
 * @linkforge/shared
 *
 * Single source of truth for the contract between the API (NestJS) and the
 * web client (Next.js). Both sides import the same Zod schemas, so a change to
 * a validation rule can never drift between server and client.
 */
export * from "./schemas/auth.js";
export * from "./schemas/link.js";
export * from "./schemas/analytics.js";
export * from "./types.js";
