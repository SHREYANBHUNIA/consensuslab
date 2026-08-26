import { describe, expect, it } from "vitest";
import { appendCommand, applyScenario, consistencySummary, createSimulation, failNode, healNetwork, partitionCluster, restoreNode, setNetwork, startElection } from "./simulation";

describe("Raft-like simulation engine", () => {
  it("elects a leader once a majority grants votes", () => {
    const state = startElection(failNode(createSimulation(), "node-a"), "node-b");
    expect(state.leaderId).toBe("node-b");
    expect(state.nodes.find(node => node.id === "node-b")?.role).toBe("leader");
  });

  it("commits an entry after leader and follower acknowledgements form a quorum", () => {
    const state = appendCommand(createSimulation(), "append ledger.43");
    expect(state.nodes.find(node => node.id === "node-a")?.commitIndex).toBe(4);
    expect(consistencySummary(state).consistent).toBe(true);
  });

  it("prevents an isolated leader from committing alone", () => {
    const state = appendCommand(partitionCluster(createSimulation(), ["node-a"], ["node-b", "node-c"]), "append isolated");
    expect(state.nodes.find(node => node.id === "node-a")?.commitIndex).toBe(3);
    expect(state.events[0]?.kind).toBe("PENDING");
  });

  it("keeps an entry pending when deterministic message loss blocks acknowledgements", () => {
    const state = appendCommand(setNetwork(createSimulation(), { messageLoss: 0.95 }), "append lossy");
    expect(state.nodes.find(node => node.id === "node-a")?.commitIndex).toBe(3);
    expect(state.events[0]?.kind).toBe("PENDING");
  });

  it("recovers a stale follower by catching it up with the committed leader log", () => {
    let state = applyScenario("recovery");
    state = appendCommand(state, "append recovery-proof");
    state = healNetwork(state);
    state = restoreNode(state, "node-c");
    expect(state.nodes.find(node => node.id === "node-c")?.commitIndex).toBe(4);
    expect(consistencySummary(state).consistent).toBe(true);
  });
});
