import { pgTable, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import type { Story } from "@/types/movie";

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  concept: text("concept").notNull(),
  genre: text("genre").notNull(),
  tone: text("tone").notNull(),
  targetDuration: integer("target_duration").notNull(),
  aspectRatio: text("aspect_ratio").notNull(),
  visualStyle: text("visual_style").notNull(),
  qualityTier: text("quality_tier").notNull().default("draft"),
  storyJson: jsonb("story_json").$type<Story>(),
  currentStep: text("current_step").notNull().default("prompt"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const generatedAssets = pgTable("generated_assets", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  shotId: text("shot_id").notNull(),
  assetType: text("asset_type").notNull(), // "storyboard" | "video" | "character_sheet"
  blobUrl: text("blob_url").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projectVersions = pgTable("project_versions", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").notNull(),
  label: text("label"),
  snapshotJson: jsonb("snapshot_json").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type DbProject = typeof projects.$inferSelect;
export type DbAsset = typeof generatedAssets.$inferSelect;
export type DbVersion = typeof projectVersions.$inferSelect;
