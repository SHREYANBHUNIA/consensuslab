import { ConsensusGraph } from "@/components/ConsensusGraph";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { createSimulation, consistencySummary, scenarioMeta, type ScenarioKey } from "../../../shared/simulation";
import { Activity, ArrowDownToLine, CirclePause, CirclePlay, CloudLightning, Cpu, Database, GitBranch, HeartPulse, Network, Pause, Play, RotateCcw, ShieldCheck, Sparkles, StepForward, TimerReset, TriangleAlert, WifiOff } from "lucide-react";
import { useState } from "react";

const commands = ["append invoice.043", "commit lease.fresh", "set quorum.trace = verbose", "append recovery.marker"];

const roleCopy = {
  leader: "Leads replication",
  follower: "Mirrors leader log",
  candidate: "Collecting votes",
  offline: "Unavailable",
};

const actionCopy: Record<string, string> = {
  start: "Simulation started — synchronized ticks are now advancing.",
  pause: "Simulation paused — use Step to inspect one transition at a time.",
  step: "One consensus transition has been applied.",
  reset: "Cluster reset to its healthy baseline.",
  elect: "A new election has been requested.",
  scenario: "Curated condition applied to the cluster.",
  append: "A new log command has been proposed to the leader.",
  fail: "Node failure injected into the cluster.",
  restore: "Node restored and eligible to catch up.",
  "toggle-link": "Network link state updated.",
  partition: "Network partition injected.",
  heal: "Network paths healed.",
  recover: "Full cluster recovery has started.",
  settings: "Transport setting updated.",
};

export default function Home() {
  const [fallback] = useState(() => createSimulation());
  const [controlNotice, setControlNotice] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const snapshotQuery = trpc.simulation.snapshot.useQuery(undefined, { refetchInterval: 700, refetchIntervalInBackground: true });
  const action = trpc.simulation.dispatch.useMutation({
    onSuccess: (nextSnapshot, variables) => {
      utils.simulation.snapshot.setData(undefined, nextSnapshot);
      setControlNotice(`${actionCopy[variables.kind] ?? "Cluster action applied."} Live state is now v${nextSnapshot.version}.`);
      void utils.simulation.snapshot.invalidate();
    },
    onError: () => setControlNotice("The action could not be applied. The live connection will retry automatically."),
  });
  const saveRun = trpc.simulation.saveRun.useMutation();
  const snapshot = snapshotQuery.data;
  const state = snapshot?.state ?? fallback;
  const consistency = snapshot?.consistency ?? consistencySummary(state);
  const summary = snapshot?.summary;
  const isWorking = action.isPending;

  const dispatch = (payload: Parameters<typeof action.mutate>[0]) => {
    setControlNotice("Applying change to the shared cluster…");
    action.mutate(payload);
  };
  const selectedMeta = scenarioMeta[state.selectedScenario];

  return (
    <div className="dream-app">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="ambient ambient-three" />
      <div className="editorial-line line-left" />
      <div className="editorial-line line-right" />

      <header className="site-header shell">
        <a className="brand" href="#top" aria-label="ConsensusLab home">
          <span className="brand-mark"><span /></span>
          <span>Consensus<em>Lab</em></span>
        </a>
        <nav className="header-nav" aria-label="Primary navigation">
          <a href="#topology">Topology</a>
          <a href="#chronicle">Chronicle</a>
          <a href="#mirrors">Log mirrors</a>
        </nav>
        <div className="sync-state"><span className="live-pulse" /> synchronized <span className="synced-dot">•</span> v{snapshot?.version ?? 0}</div>
      </header>

      <main className="shell" id="top">
        <section className="hero-section">
          <div className="hero-copy">
            <p className="eyebrow"><Sparkles size={14} /> a gentle guide to distributed agreement</p>
            <h1>Consensus,<br /><i>in motion.</i></h1>
            <p className="hero-summary">Observe how a small Raft-like cluster holds its shape through delay, doubt, failure, and return.</p>
          </div>
          <div className="hero-aside bracket-card">
            <p className="mini-label">current study</p>
            <div className="study-title"><span className="study-number">0{state.term}</span><span>{selectedMeta.label}</span></div>
            <p>{selectedMeta.description}</p>
            <div className="hero-stats">
              <span><b>{consistency.available}</b> live nodes</span>
              <span><b>{consistency.quorum}</b> quorum</span>
              <span><b>{state.messages.filter(message => message.status === "queued").length}</b> in transit</span>
            </div>
          </div>
        </section>

        <section className="status-ribbon" aria-label="Consensus health summary">
          <div className="ribbon-check"><ShieldCheck size={17} /><span>{consistency.consistent ? "Log consistency protected" : "Consistency attention required"}</span></div>
          <div><small>TERM</small><strong>{state.term}</strong></div>
          <div><small>LEADER</small><strong>{state.leaderId ? state.nodes.find(node => node.id === state.leaderId)?.label : "electing…"}</strong></div>
          <div><small>COMMITTED</small><strong>index {consistency.committed}</strong></div>
          <div><small>HEARTBEAT</small><strong>{state.running ? "flowing" : "paused"}</strong></div>
        </section>

        <section className="workspace-grid">
          <div className="topology-panel panel bracket-panel" id="topology">
            <div className="panel-heading">
              <div>
                <p className="section-kicker"><Network size={15} /> quorum field</p>
                <h2>The cluster has a shared pulse.</h2>
              </div>
              <span className="link-hint">select a link to isolate it</span>
            </div>
            <ConsensusGraph nodes={state.nodes} links={state.links} messages={state.messages} onToggleLink={(source, target) => dispatch({ kind: "toggle-link", source, target })} />
            <div className="graph-legend">
              <span><i className="legend leader" /> leader</span><span><i className="legend follower" /> follower</span><span><i className="legend candidate" /> candidate</span><span><i className="legend offline" /> unavailable</span>
              <span className="graph-caption">{state.messages.filter(message => message.status === "delivered").length} delivered signals</span>
            </div>
          </div>

          <aside className="chronicle-panel panel" id="chronicle">
            <div className="panel-heading compact"><div><p className="section-kicker"><Activity size={15} /> event chronicle</p><h2>What the cluster remembers</h2></div><span className="event-count">{state.events.length}</span></div>
            <div className="event-stream">
              {state.events.map(event => (
                <article className={cn("event-row", `tone-${event.tone}`)} key={event.id}>
                  <span className="event-rail"><i /></span>
                  <div><p className="event-kind">T+{event.tick.toString().padStart(2, "0")} · {event.kind}</p><h3>{event.headline}</h3><p>{event.detail}</p></div>
                </article>
              ))}
            </div>
          </aside>
        </section>

        <section className="mirror-section" id="mirrors">
          <div className="mirror-heading"><div><p className="section-kicker"><Database size={15} /> replicated log</p><h2>Three local views, one committed truth.</h2></div><span className="mirror-note">entries through index {consistency.committed} are durable</span></div>
          <div className="node-mirrors">
            {state.nodes.map(node => (
              <article className={cn("mirror-card", `role-${node.role}`)} key={node.id}>
                <div className="mirror-top"><div><p className="node-role">{node.role}</p><h3>{node.label}</h3><span>{roleCopy[node.role]}</span></div><button className="node-action" disabled={isWorking} onClick={() => dispatch(node.role === "offline" ? { kind: "restore", nodeId: node.id } : { kind: "fail", nodeId: node.id })}>{node.role === "offline" ? "restore" : "fail node"}</button></div>
                <div className="log-stack">
                  {node.log.length ? node.log.map(entry => <div className={cn("log-entry", entry.committed ? "is-committed" : "is-pending")} key={`${node.id}-${entry.index}`}><span>{entry.index.toString().padStart(2, "0")}</span><em>t{entry.term}</em><p>{entry.command}</p><i>{entry.committed ? "committed" : "pending"}</i></div>) : <p className="empty-log">No replicated records while the node is offline.</p>}
                </div>
                <div className="mirror-foot"><span>commit <b>{node.commitIndex}</b></span><span>applied <b>{node.appliedIndex}</b></span></div>
              </article>
            ))}
          </div>
        </section>

        <section className="scenario-strip panel">
          <div className="scenario-copy"><p className="section-kicker"><GitBranch size={15} /> curated paths</p><h2>Explore a condition, then change it.</h2></div>
          <div className="scenario-options">
            {(Object.entries(scenarioMeta) as [ScenarioKey, typeof selectedMeta][]).map(([key, meta]) => <button className={cn("scenario-pill", state.selectedScenario === key && "active")} key={key} onClick={() => dispatch({ kind: "scenario", scenario: key })}><span>{meta.label}</span><small>{meta.description}</small></button>)}
          </div>
        </section>

        <section className="orchestrator panel bracket-panel">
          <div className="orchestrator-top"><div><p className="section-kicker"><Cpu size={15} /> orchestration desk</p><h2>Turn uncertainty into an experiment.</h2></div><div className="session-name"><span>RUN ID</span>{state.id.slice(-8).toUpperCase()}</div></div>
          <div className="orchestrator-grid">
            <div className="playback-controls">
              <Button className="play-button" disabled={isWorking} onClick={() => dispatch({ kind: state.running ? "pause" : "start" })}>{state.running ? <><CirclePause size={18} /> Pause</> : <><CirclePlay size={18} /> Start</>}</Button>
              <button aria-label="Step simulation" className="icon-control" disabled={isWorking} onClick={() => dispatch({ kind: "step" })}><StepForward size={17} /></button>
              <button aria-label="Reset simulation" className="icon-control" disabled={isWorking} onClick={() => dispatch({ kind: "reset" })}><RotateCcw size={17} /></button>
              <button aria-label="Force an election" className="icon-control" disabled={isWorking} onClick={() => dispatch({ kind: "elect" })}><HeartPulse size={17} /></button>
            </div>
            <div className="range-controls">
              <label><span>network latency <b>{state.config.latency}ms</b></span><input type="range" min="60" max="720" step="60" value={state.config.latency} onChange={event => dispatch({ kind: "settings", latency: Number(event.currentTarget.value) })} /></label>
              <label><span>message loss <b>{Math.round(state.config.messageLoss * 100)}%</b></span><input type="range" min="0" max="0.8" step="0.05" value={state.config.messageLoss} onChange={event => dispatch({ kind: "settings", messageLoss: Number(event.currentTarget.value) })} /></label>
            </div>
            <div className="fault-controls">
              <button onClick={() => dispatch({ kind: "partition", left: ["node-a"], right: ["node-b", "node-c"] })}><WifiOff size={15} /> split cluster</button>
              <button onClick={() => dispatch({ kind: "heal" })}><CloudLightning size={15} /> heal paths</button>
              <button onClick={() => dispatch({ kind: "append", command: commands[state.tick % commands.length] })}><ArrowDownToLine size={15} /> append command</button>
              <button onClick={() => dispatch({ kind: "recover" })}><HeartPulse size={15} /> recover cluster</button>
            </div>
          </div>
          <div className="orchestrator-foot"><span className="control-feedback" role="status" aria-live="polite"><TimerReset size={14} /> {controlNotice ?? (state.running ? "Clock is advancing in synchronized intervals." : "Clock is paused. Step to inspect a single transition.")}</span><button className="save-run" disabled={!summary || saveRun.isPending} onClick={() => summary && saveRun.mutate({ summary: { ...summary, scenarioName: state.selectedScenario }, status: "completed" })}>{saveRun.isPending ? "saving…" : "save run summary"}</button></div>
        </section>
      </main>

      <footer className="site-footer shell"><span>CONSENSUSLAB / RAFT-LIKE SIMULATION</span><span>leader election · replication · recovery</span><span>built for calm systems thinking</span></footer>
      {snapshotQuery.isError && <div className="connection-warning"><TriangleAlert size={15} /> Live connection is recovering; local state remains visible.</div>}
    </div>
  );
}
