import { int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const simulationScenarios = mysqlTable("simulationScenarios", {
  id: varchar("id", { length: 48 }).primaryKey(),
  ownerOpenId: varchar("ownerOpenId", { length: 64 }),
  name: varchar("name", { length: 120 }).notNull(),
  configuration: json("configuration").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const simulationRuns = mysqlTable("simulationRuns", {
  id: varchar("id", { length: 48 }).primaryKey(),
  ownerOpenId: varchar("ownerOpenId", { length: 64 }),
  scenarioName: varchar("scenarioName", { length: 120 }).notNull(),
  summary: json("summary").notNull(),
  status: mysqlEnum("status", ["completed", "interrupted", "reset"]).default("completed").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
