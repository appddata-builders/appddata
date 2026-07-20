import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { getAuthProvider, getAuthSchema, getDb } from "@/db";

const secret =
  process.env.BETTER_AUTH_SECRET ??
  "dev-only-better-auth-secret-change-in-production-min-32-chars";

const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

export const auth = betterAuth({
  secret,
  baseURL,
  database: drizzleAdapter(getDb(), {
    provider: getAuthProvider(),
    schema: getAuthSchema(),
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [nextCookies()],
});
