export type NodeRole = "leader" | "follower" | "candidate" | "offline";
export type MessageKind = "heartbeat" | "request-vote" | "vote" | "append" | "ack" | "recovery";
export type EventTone = "violet" | "mint" | "blush" | "slate";

export interface LogEntry { index: number; term: number; command: string; committed: boolean; }
export interface SimNode { id: string; label: string; role: NodeRole; term: number; votedFor: string | null; commitIndex: number; appliedIndex: number; lastHeartbeat: number; log: LogEntry[]; partition: "a" | "b" | null; }
export interface Link { id: string; source: string; target: string; status: "healthy" | "slow" | "isolated" | "partitioned"; }
export interface SimMessage { id: string; source: string; target: string; kind: MessageKind; term: number; label: string; createdTick: number; deliveryTick: number; deliverable: boolean; status: "queued" | "delivered" | "dropped"; }
export interface SimulationEvent { id: string; tick: number; kind: string; headline: string; detail: string; tone: EventTone; }
export interface SimulationConfig { latency: number; messageLoss: number; heartbeatInterval: number; }
export interface FaultState { failedNodeIds: string[]; isolatedLinkIds: string[]; partitioned: boolean; }
export interface SimulationState { id: string; name: string; tick: number; running: boolean; term: number; leaderId: string | null; nodes: SimNode[]; links: Link[]; messages: SimMessage[]; events: SimulationEvent[]; config: SimulationConfig; faults: FaultState; selectedScenario: ScenarioKey; }
export interface RunSummary { id: string; scenarioName: string; tick: number; term: number; leaderId: string | null; committed: number; consistent: boolean; quorum: number; available: number; eventCount: number; completedAt: number; }
export type ScenarioKey = "steady" | "follower-failure" | "leader-isolation" | "partition" | "message-loss" | "recovery";

export const scenarioMeta: Record<ScenarioKey, { label: string; description: string }> = {
  steady: { label: "Steady state", description: "A healthy leader keeps three nodes in agreement." },
  "follower-failure": { label: "Follower outage", description: "A follower drops out while the leader preserves quorum." },
  "leader-isolation": { label: "Leader partition", description: "The leader loses its links and the majority elects anew." },
  partition: { label: "Network split", description: "A majority island continues while an isolated peer cannot commit." },
  "message-loss": { label: "Lossy transport", description: "Intermittent delivery exposes retries and delayed agreement." },
  recovery: { label: "Recovery catch-up", description: "A stale follower returns and receives the committed log." },
};

const nodeSeeds = [{ id: "node-a", label: "Node A" }, { id: "node-b", label: "Node B" }, { id: "node-c", label: "Node C" }];
const links = (): Link[] => [
  { id: "node-a:node-b", source: "node-a", target: "node-b", status: "healthy" },
  { id: "node-a:node-c", source: "node-a", target: "node-c", status: "healthy" },
  { id: "node-b:node-c", source: "node-b", target: "node-c", status: "healthy" },
];
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const byId = (state: SimulationState, id: string) => state.nodes.find(node => node.id === id);
const linkId = (a: string, b: string) => [a, b].sort().join(":");
const quorum = (state: SimulationState) => Math.floor(state.nodes.length / 2) + 1;

function addEvent(state: SimulationState, kind: string, headline: string, detail: string, tone: EventTone = "slate") {
  state.events.unshift({ id: `event-${state.tick}-${state.events.length + 1}`, tick: state.tick, kind, headline, detail, tone });
  state.events = state.events.slice(0, 28);
}

function canCommunicate(state: SimulationState, a: string, b: string) {
  const aNode = byId(state, a);
  const bNode = byId(state, b);
  const link = state.links.find(item => item.id === linkId(a, b));
  return Boolean(aNode && bNode && aNode.role !== "offline" && bNode.role !== "offline" && link && link.status !== "isolated" && link.status !== "partitioned" && !(aNode.partition && bNode.partition && aNode.partition !== bNode.partition));
}

function emitMessage(state: SimulationState, source: string, target: string, kind: MessageKind, label: string) {
  const link = state.links.find(item => item.id === linkId(source, target));
  const scaledLatency = state.config.latency * (link?.status === "slow" ? 1.75 : 1);
  const deliveryTick = state.tick + Math.max(1, Math.ceil(scaledLatency / 180));
  const lossSeed = ((state.tick * 19 + source.length * 17 + target.length * 29 + kind.length * 13) % 100) / 100;
  const dropped = lossSeed < Math.max(0, Math.min(0.95, state.config.messageLoss));
  const deliverable = canCommunicate(state, source, target) && !dropped;
  state.messages.unshift({ id: `message-${state.tick}-${state.messages.length + 1}-${source}-${target}`, source, target, kind, term: state.term, label, createdTick: state.tick, deliveryTick, deliverable, status: deliverable ? "queued" : "dropped" });
  state.messages = state.messages.slice(0, 16);
  return deliverable;
}

function markCommitted(node: SimNode, index: number) {
  node.log = node.log.map(entry => entry.index <= index ? { ...entry, committed: true } : entry);
  node.commitIndex = Math.max(node.commitIndex, index);
  node.appliedIndex = node.commitIndex;
}

function catchUpFollower(state: SimulationState, follower: SimNode) {
  const leader = state.leaderId ? byId(state, state.leaderId) : undefined;
  if (!leader || follower.role === "offline" || !canCommunicate(state, leader.id, follower.id)) return false;
  follower.log = clone(leader.log);
  follower.term = Math.max(follower.term, leader.term);
  follower.commitIndex = leader.commitIndex;
  follower.appliedIndex = leader.appliedIndex;
  follower.lastHeartbeat = state.tick;
  emitMessage(state, leader.id, follower.id, "recovery", `catch up • ${leader.commitIndex} entries`);
  addEvent(state, "RECOVERY", `${follower.label} catches up`, `Committed log through index ${leader.commitIndex} is restored from ${leader.label}.`, "mint");
  return true;
}

export function createSimulation(name = "Three-node consensus"): SimulationState {
  const seedLog: LogEntry[] = [
    { index: 1, term: 2, command: "set cluster.mode = calm", committed: true },
    { index: 2, term: 3, command: "append observability = on", committed: true },
    { index: 3, term: 4, command: "commit ledger.42", committed: true },
  ];
  const state: SimulationState = {
    id: `run-${Date.now()}`, name, tick: 0, running: false, term: 4, leaderId: "node-a",
    nodes: nodeSeeds.map(seed => ({ ...seed, role: seed.id === "node-a" ? "leader" : "follower", term: 4, votedFor: "node-a", commitIndex: 3, appliedIndex: 3, lastHeartbeat: 0, log: clone(seedLog), partition: null })),
    links: links(), messages: [], events: [], config: { latency: 180, messageLoss: 0, heartbeatInterval: 3 }, faults: { failedNodeIds: [], isolatedLinkIds: [], partitioned: false }, selectedScenario: "steady",
  };
  addEvent(state, "READY", "Cluster initialized", "Term 4 has a healthy leader and a fully committed three-entry log.", "violet");
  return state;
}

export function startElection(input: SimulationState, candidateId?: string): SimulationState {
  const state = clone(input);
  const candidate = candidateId ? byId(state, candidateId) : state.nodes.find(node => node.role !== "offline");
  if (!candidate || candidate.role === "offline") return state;
  state.term = Math.max(state.term, ...state.nodes.map(node => node.term)) + 1;
  state.leaderId = null;
  state.nodes.forEach(node => { if (node.role === "leader") node.role = "follower"; });
  candidate.role = "candidate";
  candidate.term = state.term;
  candidate.votedFor = candidate.id;
  let votes = 1;
  addEvent(state, "ELECTION", `${candidate.label} requests votes`, `Term ${state.term} begins after leadership is unavailable.`, "blush");
  state.nodes.forEach(voter => {
    if (voter.id === candidate.id || voter.role === "offline") return;
    const requestDelivered = emitMessage(state, candidate.id, voter.id, "request-vote", "RequestVote");
    if (requestDelivered) {
      voter.term = state.term;
      voter.votedFor = candidate.id;
      votes += 1;
      emitMessage(state, voter.id, candidate.id, "vote", "vote granted");
    }
  });
  if (votes >= quorum(state)) {
    candidate.role = "leader";
    state.leaderId = candidate.id;
    state.nodes.forEach(node => { if (node.id !== candidate.id && node.role !== "offline") node.role = "follower"; });
    addEvent(state, "LEADER", `${candidate.label} becomes leader`, `${votes}/${state.nodes.length} votes establish term ${state.term}.`, "violet");
  } else {
    addEvent(state, "NO QUORUM", `${candidate.label} remains candidate`, `Only ${votes}/${quorum(state)} required votes crossed the partition.`, "blush");
  }
  return state;
}

export function appendCommand(input: SimulationState, command = "append command") {
  const state = clone(input);
  const leader = state.leaderId ? byId(state, state.leaderId) : undefined;
  if (!leader || leader.role !== "leader") {
    addEvent(state, "REJECTED", "No leader can append", "A command waits until a quorum elects an active leader.", "blush");
    return state;
  }
  const entry: LogEntry = { index: leader.log.length + 1, term: state.term, command, committed: false };
  leader.log.push(entry);
  let acknowledgements = 1;
  state.nodes.forEach(follower => {
    if (follower.id === leader.id || follower.role === "offline") return;
    const appendDelivered = emitMessage(state, leader.id, follower.id, "append", `AppendEntries #${entry.index}`);
    if (appendDelivered) {
      follower.log = [...follower.log.filter(item => item.index < entry.index), clone(entry)];
      follower.term = state.term;
      acknowledgements += 1;
      emitMessage(state, follower.id, leader.id, "ack", "append ack");
    }
  });
  if (acknowledgements >= quorum(state)) {
    state.nodes.forEach(node => { if (node.log.some(item => item.index === entry.index && item.term === entry.term)) markCommitted(node, entry.index); });
    addEvent(state, "COMMIT", `Index ${entry.index} commits`, `${acknowledgements}/${state.nodes.length} acknowledgements satisfy the quorum.`, "mint");
  } else {
    addEvent(state, "PENDING", `Index ${entry.index} remains uncommitted`, `${acknowledgements}/${quorum(state)} required acknowledgements arrived.`, "blush");
  }
  return state;
}

export function tickSimulation(input: SimulationState): SimulationState {
  let state = clone(input);
  state.tick += 1;
  state.messages = state.messages.filter(message => state.tick <= message.deliveryTick + 2).map(message => message.status === "queued" && state.tick >= message.deliveryTick ? { ...message, status: "delivered" } : message);
  const leader = state.leaderId ? byId(state, state.leaderId) : undefined;
  if (!leader || leader.role !== "leader") {
    const candidate = state.nodes.filter(node => node.role !== "offline").sort((a, b) => {
      const reachable = (node: SimNode) => state.nodes.filter(peer => peer.id !== node.id && canCommunicate(state, node.id, peer.id)).length;
      return reachable(b) - reachable(a);
    })[0];
    return candidate ? startElection(state, candidate.id) : state;
  }
  if (state.tick % state.config.heartbeatInterval !== 0) return state;
  let acknowledgements = 1;
  state.nodes.forEach(follower => {
    if (follower.id === leader.id || follower.role === "offline") return;
    const heartbeatDelivered = emitMessage(state, leader.id, follower.id, "heartbeat", "heartbeat");
    if (heartbeatDelivered) {
      follower.lastHeartbeat = state.tick;
      follower.term = state.term;
      follower.role = "follower";
      acknowledgements += 1;
    }
  });
  if (acknowledgements < quorum(state)) {
    leader.role = "follower";
    state.leaderId = null;
    addEvent(state, "STEP DOWN", `${leader.label} loses quorum`, "Heartbeats cannot reach a majority, so leadership is relinquished.", "blush");
  } else {
    addEvent(state, "HEARTBEAT", `${leader.label} renews leadership`, `${acknowledgements}/${state.nodes.length} nodes acknowledge term ${state.term}.`, "slate");
  }
  return state;
}

export function failNode(input: SimulationState, id: string): SimulationState {
  const state = clone(input);
  const node = byId(state, id);
  if (!node) return state;
  node.role = "offline";
  if (!state.faults.failedNodeIds.includes(id)) state.faults.failedNodeIds.push(id);
  if (state.leaderId === id) state.leaderId = null;
  addEvent(state, "FAILURE", `${node.label} goes offline`, state.leaderId ? "The remaining nodes continue to seek a quorum." : "Leadership is unavailable; a new election will follow.", "blush");
  return state;
}

export function restoreNode(input: SimulationState, id: string): SimulationState {
  const state = clone(input);
  const node = byId(state, id);
  if (!node) return state;
  node.role = "follower";
  node.partition = null;
  state.faults.failedNodeIds = state.faults.failedNodeIds.filter(nodeId => nodeId !== id);
  addEvent(state, "RESTORE", `${node.label} returns`, "The node is available to receive heartbeats and recover missing entries.", "mint");
  catchUpFollower(state, node);
  return state;
}

export function toggleLink(input: SimulationState, source: string, target: string): SimulationState {
  const state = clone(input);
  const link = state.links.find(item => item.id === linkId(source, target));
  if (!link) return state;
  link.status = link.status === "isolated" ? "healthy" : "isolated";
  state.faults.isolatedLinkIds = link.status === "isolated" ? (state.faults.isolatedLinkIds.includes(link.id) ? state.faults.isolatedLinkIds : [...state.faults.isolatedLinkIds, link.id]) : state.faults.isolatedLinkIds.filter(linkIdValue => linkIdValue !== link.id);
  addEvent(state, "LINK", `${link.status === "isolated" ? "Isolated" : "Restored"} ${link.source.replace("node-", "Node ").toUpperCase()} ↔ ${link.target.replace("node-", "Node ").toUpperCase()}`, link.status === "isolated" ? "Messages on this path are blocked." : "The path can carry consensus traffic again.", link.status === "isolated" ? "blush" : "mint");
  return state;
}

export function setNetwork(input: SimulationState, patch: Partial<SimulationConfig>): SimulationState {
  const state = clone(input);
  state.config = { ...state.config, ...patch };
  state.links.forEach(link => { if (link.status === "healthy" || link.status === "slow") link.status = state.config.latency >= 360 ? "slow" : "healthy"; });
  return state;
}

export function partitionCluster(input: SimulationState, left: string[], right: string[]): SimulationState {
  const state = clone(input);
  state.nodes.forEach(node => { node.partition = left.includes(node.id) ? "a" : right.includes(node.id) ? "b" : null; });
  state.faults.partitioned = true;
  state.links = state.links.map(link => ({ ...link, status: left.includes(link.source) !== left.includes(link.target) && right.includes(link.source) !== right.includes(link.target) ? "partitioned" : link.status === "partitioned" ? "healthy" : link.status }));
  addEvent(state, "PARTITION", "Cluster divides into two islands", "Cross-partition messages stop; only a majority side can elect and commit.", "blush");
  return state;
}

export function healNetwork(input: SimulationState): SimulationState {
  const state = clone(input);
  state.nodes.forEach(node => (node.partition = null));
  state.links.forEach(link => { if (link.status === "partitioned" || link.status === "isolated") link.status = "healthy"; });
  state.faults.partitioned = false;
  state.faults.isolatedLinkIds = [];
  state.nodes.filter(node => node.role !== "offline").forEach(node => catchUpFollower(state, node));
  addEvent(state, "HEAL", "Network links heal", "Restored paths allow followers to catch up with the committed log.", "mint");
  return state;
}

export function recoverCluster(input: SimulationState): SimulationState {
  const state = healNetwork(input);
  state.nodes.filter(node => node.role === "offline").forEach(node => {
    node.role = "follower";
    node.partition = null;
    catchUpFollower(state, node);
  });
  state.faults.failedNodeIds = [];
  addEvent(state, "RECOVER", "Cluster recovery completes", "All failed nodes are restored, paths are healed, and followers reconcile with the committed leader log.", "mint");
  return state;
}

export function consistencySummary(state: SimulationState) {
  const leader = state.leaderId ? byId(state, state.leaderId) : undefined;
  const available = state.nodes.filter(node => node.role !== "offline");
  const committed = leader?.commitIndex ?? Math.max(0, ...state.nodes.map(node => node.commitIndex));
  const consistent = !leader || available.every(node => leader.log.slice(0, committed).every((entry, index) => {
    const peerEntry = node.log[index];
    return peerEntry && peerEntry.term === entry.term && peerEntry.command === entry.command;
  }));
  return { consistent, committed, quorum: quorum(state), available: available.length };
}

export function toRunSummary(state: SimulationState): RunSummary {
  const consistency = consistencySummary(state);
  return { id: state.id, scenarioName: state.selectedScenario, tick: state.tick, term: state.term, leaderId: state.leaderId, committed: consistency.committed, consistent: consistency.consistent, quorum: consistency.quorum, available: consistency.available, eventCount: state.events.length, completedAt: Date.now() };
}

export function applyScenario(key: ScenarioKey): SimulationState {
  let state = createSimulation(scenarioMeta[key].label);
  state.selectedScenario = key;
  if (key === "follower-failure") state = failNode(state, "node-b");
  if (key === "message-loss") state = setNetwork(state, { messageLoss: 0.35, latency: 420 });
  if (key === "leader-isolation") {
    state = partitionCluster(state, ["node-a"], ["node-b", "node-c"]);
    const leader = byId(state, "node-a");
    if (leader) leader.role = "follower";
    state.leaderId = null;
    addEvent(state, "SCENARIO", "The isolated leader is no longer authoritative", "Nodes B and C form a majority and will elect their own leader.", "violet");
  }
  if (key === "partition") {
    state = partitionCluster(state, ["node-a", "node-b"], ["node-c"]);
    addEvent(state, "SCENARIO", "A general network split is active", "Nodes A and B retain quorum while Node C cannot receive new commits.", "violet");
  }
  if (key === "recovery") {
    state = failNode(state, "node-c");
    const node = byId(state, "node-c");
    if (node) node.log = node.log.slice(0, 1);
  }
  return state;
}
