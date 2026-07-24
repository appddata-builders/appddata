/**
 * Schema PostgreSQL (produccion).
 *
 * Espejo exacto de schema.sqlite.ts: mismos nombres de tabla y de columna, solo
 * cambian los tipos propios del dialecto (boolean nativo en vez de integer,
 * timestamp en vez de epoch en milisegundos). Si agregas una columna aqui,
 * agregala tambien alla o el switch de driver dejara de cuadrar.
 */
import { relations } from "drizzle-orm";
import { boolean, index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  /** "admin" ve todo el panel; "cliente" solo su propio proyecto. */
  role: text("role").notNull().default("cliente"),
  phone: text("phone"),
  /** ID legible para iniciar sesion sin correo, p. ej. "AP0001". */
  displayId: text("display_id").unique(),
  idPrefix: text("id_prefix").notNull().default("AP"),
  /** Slug de `project` al que pertenece el usuario; null para admins. */
  projectSlug: text("project_slug"),
  /** Un usuario inhabilitado existe pero no puede iniciar sesion. */
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { precision: 3, mode: "date" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { precision: 3, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { precision: 3, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { precision: 3, mode: "date" }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { precision: 3, mode: "date" }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { precision: 3, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { precision: 3, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { precision: 3, mode: "date" }).notNull(),
    createdAt: timestamp("created_at", { precision: 3, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { precision: 3, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const siteEntitlement = pgTable(
  "site_entitlement",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    plan: text("plan").notNull(),
    stripeSessionId: text("stripe_session_id").notNull(),
    projectSlug: text("project_slug"),
    createdAt: timestamp("created_at", { precision: 3, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("site_entitlement_user_id_idx").on(table.userId),
    uniqueIndex("site_entitlement_stripe_session_uidx").on(table.stripeSessionId),
  ],
);

export const iminEntitlement = pgTable(
  "imin_entitlement",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    tier: text("tier").notNull(),
    stripeSessionId: text("stripe_session_id").notNull(),
    expiresAt: timestamp("expires_at", { precision: 3, mode: "date" }).notNull(),
    createdAt: timestamp("created_at", { precision: 3, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("imin_entitlement_user_id_idx").on(table.userId),
    uniqueIndex("imin_entitlement_stripe_session_uidx").on(table.stripeSessionId),
  ],
);

export const accountSubscription = pgTable(
  "account_subscription",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id").notNull(),
    status: text("status").notNull(),
    currentPeriodEnd: timestamp("current_period_end", { precision: 3, mode: "date" }),
    createdAt: timestamp("created_at", { precision: 3, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("account_subscription_user_id_idx").on(table.userId),
    uniqueIndex("account_subscription_stripe_id_uidx").on(table.stripeSubscriptionId),
  ],
);

export const userProject = pgTable(
  "user_project",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    projectSlug: text("project_slug").notNull(),
    siteUrl: text("site_url").notNull(),
    createdAt: timestamp("created_at", { precision: 3, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("user_project_user_id_idx").on(table.userId),
    uniqueIndex("user_project_user_slug_uidx").on(table.userId, table.projectSlug),
  ],
);

export const project = pgTable("project", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  /** Paquete contratado: "free" o "imin". Ver lib/plans.ts. */
  plan: text("plan").notNull().default("free"),
  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const projectText = pgTable(
  "project_text",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    contentKey: text("content_key").notNull(),
    contentValue: text("content_value").notNull(),
    createdAt: timestamp("created_at", { precision: 3, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { precision: 3, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("project_text_project_id_idx").on(table.projectId),
    uniqueIndex("project_text_project_id_content_key_uidx").on(table.projectId, table.contentKey),
  ],
);

export const hydrate = pgTable(
  "hydrate",
  {
    id: text("id").primaryKey(),
    projectSlug: text("project_slug").notNull(),
    contentKey: text("content_key").notNull(),
    contentValue: text("content_value").notNull(),
    createdAt: timestamp("created_at", { precision: 3, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { precision: 3, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("hydrate_project_slug_idx").on(table.projectSlug),
    uniqueIndex("hydrate_project_slug_content_key_uidx").on(table.projectSlug, table.contentKey),
  ],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const projectRelations = relations(project, ({ many }) => ({
  texts: many(projectText),
}));

export const projectTextRelations = relations(projectText, ({ one }) => ({
  project: one(project, {
    fields: [projectText.projectId],
    references: [project.id],
  }),
}));
