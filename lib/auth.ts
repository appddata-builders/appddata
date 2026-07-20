import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { getAuthProvider, getAuthSchema, getDb } from "@/db";
import { getTrustedOrigins } from "@/lib/auth-trusted-origins";
import { USER_ID_PREFIX, generateDisplayId } from "@/lib/display-id";

const secret =
  process.env.BETTER_AUTH_SECRET ??
  "dev-only-better-auth-secret-change-in-production-min-32-chars";

const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

export const auth = betterAuth({
  secret,
  baseURL,
  trustedOrigins: getTrustedOrigins(),
  user: {
    additionalFields: {
      // `input: false` en todo lo que decide un admin: si el cliente pudiera
      // mandarlo en el registro, se auto-asignaria rol o proyecto.
      role: { type: "string", required: false, defaultValue: "cliente", input: false },
      phone: { type: "string", required: false },
      displayId: { type: "string", required: false, input: false },
      idPrefix: { type: "string", required: false, defaultValue: USER_ID_PREFIX, input: false },
      projectSlug: { type: "string", required: false, input: false },
      enabled: { type: "boolean", required: false, defaultValue: true, input: false },
    },
    changeEmail: { enabled: true },
    deleteUser: { enabled: true },
  },
  database: drizzleAdapter(getDb(), {
    provider: getAuthProvider(),
    schema: getAuthSchema(),
  }),
  databaseHooks: {
    user: {
      create: {
        // El display ID se asigna aqui para que valga igual si el alta viene
        // del registro publico o del panel de administracion.
        before: async (userData) => {
          const current = userData as typeof userData & {
            displayId?: string | null;
            idPrefix?: string | null;
          };
          if (current.displayId) return;
          const prefix = current.idPrefix ?? USER_ID_PREFIX;
          return {
            data: {
              ...userData,
              idPrefix: prefix,
              displayId: await generateDisplayId(getDb(), prefix),
            },
          };
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  plugins: [nextCookies()],
});
