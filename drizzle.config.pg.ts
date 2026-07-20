import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

if (!url) {
  throw new Error("DATABASE_URL o DATABASE_URL_UNPOOLED es obligatorio para drizzle-kit sobre Postgres");
}

export default defineConfig({
  schema: "./db/schema.pg.ts",
  out: "./drizzle-pg",
  dialect: "postgresql",
  dbCredentials: { url },
});
