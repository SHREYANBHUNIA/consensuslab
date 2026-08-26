import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSimulation, toRunSummary } from "../shared/simulation";
import { listScenarios, saveRun, saveScenario } from "./db";

const originalDatabaseUrl = process.env.DATABASE_URL;

describe("simulation persistence fallbacks", () => {
  beforeEach(() => {
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    if (originalDatabaseUrl) process.env.DATABASE_URL = originalDatabaseUrl;
    else delete process.env.DATABASE_URL;
  });

  it("returns local identifiers when scenario and run persistence are unavailable", async () => {
    const state = createSimulation();
    const scenario = await saveScenario({ name: state.name, configuration: state });
    const run = await saveRun({ scenarioName: state.selectedScenario, summary: toRunSummary(state), status: "completed" });

    expect(scenario).toMatchObject({ persisted: false });
    expect(run).toMatchObject({ persisted: false });
    expect(scenario.id).toMatch(/^local-/);
    expect(run.id).toMatch(/^local-/);
  });

  it("returns no saved scenarios when no persistence connection is available", async () => {
    await expect(listScenarios()).resolves.toEqual([]);
  });
});
