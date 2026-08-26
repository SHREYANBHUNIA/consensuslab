import { describe, expect, it } from "vitest";
import { createSimulation, toRunSummary } from "../shared/simulation";

describe("simulation persistence contracts", () => {
  it("produces a typed, serializable summary for persistent run history", () => {
    const summary = toRunSummary(createSimulation());
    expect(summary.scenarioName).toBe("steady");
    expect(summary.consistent).toBe(true);
    expect(summary.committed).toBe(3);
  });
});
