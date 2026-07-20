import path from "node:path";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./db/schema.sqlite.ts",
  out: "./drizzle-sqlite",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.LOCAL_DATABASE_PATH ?? path.join(process.cwd(), "local.db"),
  },
});
