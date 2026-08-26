import {
  appendCommand,
  applyScenario,
  consistencySummary,
  createSimulation,
  failNode,
  healNetwork,
  partitionCluster,
  recoverCluster,
  restoreNode,
  setNetwork,
  startElection,
  tickSimulation,
  toggleLink,
  type ScenarioKey,
  type SimulationState,
  toRunSummary,
} from "../shared/simulation";

export type LiveAction =
  | { kind: "start" | "pause" | "step" | "reset" | "heal" | "recover" | "elect" }
  | { kind: "scenario"; scenario: ScenarioKey }
  | { kind: "append"; command: string }
  | { kind: "fail" | "restore"; nodeId: string }
  | { kind: "toggle-link"; source: string; target: string }
  | { kind: "partition"; left: string[]; right: string[] }
  | { kind: "settings"; latency?: number; messageLoss?: number; heartbeatInterval?: number };

let state: SimulationState = createSimulation();
let version = 1;
let lastEvaluatedAt = Date.now();

function catchUpToWallClock() {
  if (!state.running) return;
  const now = Date.now();
  const interval = Math.max(480, state.config.latency * 2.2);
  const steps = Math.min(8, Math.floor((now - lastEvaluatedAt) / interval));
  for (let index = 0; index < steps; index += 1) state = tickSimulation(state);
  if (steps > 0) {
    version += steps;
    lastEvaluatedAt += steps * interval;
  }
}

function markChanged() {
  version += 1;
  lastEvaluatedAt = Date.now();
}

export function getLiveSnapshot() {
  catchUpToWallClock();
  return { version, state, consistency: consistencySummary(state), summary: toRunSummary(state) };
}

export function getLiveUpdate(after: number) {
  const snapshot = getLiveSnapshot();
  return { version: snapshot.version, changed: snapshot.version > after, snapshot: snapshot.version > after ? snapshot : null };
}

export function dispatchLiveAction(action: LiveAction) {
  catchUpToWallClock();
  switch (action.kind) {
    case "start": state = { ...state, running: true }; break;
    case "pause": state = { ...state, running: false }; break;
    case "step": state = tickSimulation({ ...state, running: false }); break;
    case "reset": state = createSimulation(); break;
    case "heal": state = healNetwork(state); break;
    case "recover": state = recoverCluster(state); break;
    case "elect": state = startElection(state); break;
    case "scenario": state = applyScenario(action.scenario); break;
    case "append": state = appendCommand(state, action.command); break;
    case "fail": state = failNode(state, action.nodeId); break;
    case "restore": state = restoreNode(state, action.nodeId); break;
    case "toggle-link": state = toggleLink(state, action.source, action.target); break;
    case "partition": state = partitionCluster(state, action.left, action.right); break;
    case "settings": state = setNetwork(state, action); break;
  }
  markChanged();
  return getLiveSnapshot();
}
