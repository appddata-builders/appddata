import { relations, sql } from "drizzle-orm";
import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .default(false)
    .notNull(),
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
  enabled: integer("enabled", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = sqliteTable(
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
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp_ms",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp_ms",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const siteEntitlement = sqliteTable(
  "site_entitlement",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    plan: text("plan").notNull(),
    stripeSessionId: text("stripe_session_id").notNull(),
    projectSlug: text("project_slug"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date()).notNull(),
  },
  (table) => [
    index("site_entitlement_user_id_idx").on(table.userId),
    uniqueIndex("site_entitlement_stripe_session_uidx").on(table.stripeSessionId),
  ],
);

/**
 * Acceso a IMIN a nivel de cuenta (una vez, para todos los sitios del cliente).
 * Se compra por periodo (`tier`) y caduca en `expiresAt`: pasado ese momento el
 * acceso se remueve solo (no se renueva). Volver a comprar extiende la vigencia.
 */
export const iminEntitlement = sqliteTable(
  "imin_entitlement",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    tier: text("tier").notNull(),
    stripeSessionId: text("stripe_session_id").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`).notNull(),
  },
  (table) => [
    index("imin_entitlement_user_id_idx").on(table.userId),
    uniqueIndex("imin_entitlement_stripe_session_uidx").on(table.stripeSessionId),
  ],
);

export const accountSubscription = sqliteTable(
  "account_subscription",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id").notNull(),
    status: text("status").notNull(),
    currentPeriodEnd: integer("current_period_end", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date()).notNull(),
  },
  (table) => [
    index("account_subscription_user_id_idx").on(table.userId),
    uniqueIndex("account_subscription_stripe_id_uidx").on(table.stripeSubscriptionId),
  ],
);

export const userProject = sqliteTable(
  "user_project",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    projectSlug: text("project_slug").notNull(),
    siteUrl: text("site_url").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`).notNull(),
  },
  (table) => [
    index("user_project_user_id_idx").on(table.userId),
    uniqueIndex("user_project_user_slug_uidx").on(table.userId, table.projectSlug),
  ],
);

/**
 * Periodo de facturacion CERRADO.
 *
 * Es el libro mayor del cobro: mientras el mes corre, el monto es un estimado
 * que se mueve todos los dias y no es exigible. Al cerrar el mes se congela
 * aqui con el tipo de cambio y el margen que estaban vigentes, y solo entonces
 * existe una deuda. Nada de esto se recalcula despues: una factura emitida no
 * cambia aunque cambien los precios.
 */
export const billingPeriod = sqliteTable(
  "billing_period",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    projectSlug: text("project_slug").notNull(),
    /** Mes cerrado, en formato YYYY-MM. */
    period: text("period").notNull(),
    baseCents: integer("base_cents").notNull(),
    computeCents: integer("compute_cents").notNull(),
    databaseCents: integer("database_cents").notNull(),
    platformCents: integer("platform_cents").notNull(),
    subtotalCents: integer("subtotal_cents").notNull(),
    stripeFeeCents: integer("stripe_fee_cents").notNull(),
    taxCents: integer("tax_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull(),
    /** Tipo de cambio y margen vigentes al cierre, para poder auditar. */
    fxRate: text("fx_rate").notNull(),
    margin: text("margin").notNull(),
    /** closed | issued | paid | void */
    status: text("status").notNull().default("closed"),
    stripeInvoiceId: text("stripe_invoice_id"),
    hostedInvoiceUrl: text("hosted_invoice_url"),
    closedAt: integer("closed_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`).notNull(),
    issuedAt: integer("issued_at", { mode: "timestamp_ms" }),
    paidAt: integer("paid_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("billing_period_user_id_idx").on(table.userId),
    uniqueIndex("billing_period_user_slug_period_uidx").on(table.userId, table.projectSlug, table.period),
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
