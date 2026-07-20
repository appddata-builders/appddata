/**
 * Schema SQLite (desarrollo local).
 *
 * Reexporta las definiciones que ya viven en auth-schema.ts y project-schema.ts
 * para que drizzle-kit tenga un solo punto de entrada por dialecto, igual que
 * en pilates-reformer.
 */
export * from "./auth-schema";
export * from "./project-schema";
