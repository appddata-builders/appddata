import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const project = sqliteTable("project", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
});

export const projectText = sqliteTable(
  "project_text",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    contentKey: text("content_key").notNull(),
    contentValue: text("content_value").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("project_text_project_id_idx").on(table.projectId),
    uniqueIndex("project_text_project_id_content_key_uidx").on(table.projectId, table.contentKey),
  ],
);

/**
 * Tabla de hidratacion que consumen los sitios hijos (refautomex, etc.).
 *
 * Es plana a proposito: se identifica por `project_slug` en vez de por FK a
 * `project.id` para que un sitio externo pueda leerla con drizzle sin replicar
 * el resto del schema ni hacer join.
 *
 * `content_key` lleva el locale como primer segmento, p. ej. "es.navbar.home",
 * y el sitio hijo lo expande al arbol de recursos de i18next.
 */
export const hydrate = sqliteTable(
  "hydrate",
  {
    id: text("id").primaryKey(),
    projectSlug: text("project_slug").notNull(),
    contentKey: text("content_key").notNull(),
    contentValue: text("content_value").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("hydrate_project_slug_idx").on(table.projectSlug),
    uniqueIndex("hydrate_project_slug_content_key_uidx").on(table.projectSlug, table.contentKey),
  ],
);

export const projectRelations = relations(project, ({ many }) => ({
  texts: many(projectText),
}));

export const projectTextRelations = relations(projectText, ({ one }) => ({
  project: one(project, {
    fields: [projectText.projectId],
    references: [project.id],
  }),
}));
