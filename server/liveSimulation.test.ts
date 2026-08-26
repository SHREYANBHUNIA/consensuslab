import { describe, expect, it } from "vitest";
import { dispatchLiveAction, getLiveSnapshot, getLiveUpdate } from "./liveSimulation";

describe("live simulation synchronization", () => {
  it("increments its version and exposes state changes to polling viewers", () => {
    const before = getLiveSnapshot();
    dispatchLiveAction({ kind: "scenario", scenario: "follower-failure" });
    const update = getLiveUpdate(before.version);
    expect(update.changed).toBe(true);
    expect(update.snapshot?.state.nodes.find(node => node.id === "node-b")?.role).toBe("offline");
  });

  it("allows the synchronized run to start, step, and pause", () => {
    dispatchLiveAction({ kind: "reset" });
    dispatchLiveAction({ kind: "start" });
    expect(getLiveSnapshot().state.running).toBe(true);
    dispatchLiveAction({ kind: "step" });
    expect(getLiveSnapshot().state.running).toBe(false);
  });
});
