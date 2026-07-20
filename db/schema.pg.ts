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

export const project = pgTable("project", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
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
