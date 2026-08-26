import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { nanoid } from "nanoid";
import { InsertUser, simulationRuns, simulationScenarios, users } from "../drizzle/schema";
import type { RunSummary, SimulationState } from "../shared/simulation";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); } catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: values.lastSignedIn };
  (["name", "email", "loginMethod"] as const).forEach(field => { if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = values[field]; } });
  values.role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user");
  updateSet.role = values.role;
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function saveScenario(input: { ownerOpenId?: string; name: string; configuration: SimulationState }) {
  const db = await getDb();
  if (!db) return { id: `local-${nanoid(8)}`, persisted: false };
  const id = nanoid(16);
  await db.insert(simulationScenarios).values({ id, ownerOpenId: input.ownerOpenId ?? null, name: input.name, configuration: input.configuration });
  return { id, persisted: true };
}

export async function listScenarios(ownerOpenId?: string) {
  const db = await getDb();
  if (!db) return [];
  return ownerOpenId ? db.select().from(simulationScenarios).where(eq(simulationScenarios.ownerOpenId, ownerOpenId)).orderBy(desc(simulationScenarios.updatedAt)).limit(20) : db.select().from(simulationScenarios).orderBy(desc(simulationScenarios.updatedAt)).limit(20);
}

export async function saveRun(input: { ownerOpenId?: string; scenarioName: string; summary: RunSummary; status: "completed" | "interrupted" | "reset" }) {
  const db = await getDb();
  if (!db) return { id: `local-${nanoid(8)}`, persisted: false };
  const id = nanoid(16);
  await db.insert(simulationRuns).values({ id, ownerOpenId: input.ownerOpenId ?? null, scenarioName: input.scenarioName, summary: input.summary, status: input.status });
  return { id, persisted: true };
}
