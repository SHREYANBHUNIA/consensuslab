# Orchestration control investigation

The browser renders every orchestration and scenario control as an enabled button. Recent network logs confirm that the live action endpoint can accept mutations and return synchronized state snapshots. Direct browser verification showed the Start control moves to Pause and the heartbeat changes to flowing. The interface now writes each successful mutation response directly into the local live-snapshot cache and announces the applied action, removing any perception of silent or delayed controls.

The automatic browser click successfully started the simulation. The initial scenario-change attempt did not visibly replace the active study, so the action request and event propagation for scenario controls will be checked next before final verification.

Direct verification confirmed curated scenarios, append command, split cluster, heal paths, and the steady-state reset all update the shared model and return visible feedback. A synthetic range-input event did not alter the latency label, so the timing/loss controls will be changed to commit on both `input` and `change` events and tested through the rendered range field.

The rendered range fields were then tested directly: latency updated to 360ms and message loss updated to 40%, each with a live-version increment and a visible confirmation message. Browser verification now covers start/pause, scenario selection, append, split, heal, timing, and loss controls.

Step, fail, and Recover Cluster were also exercised successfully. Reset was then isolated and confirmed with the feedback “Cluster reset to its healthy baseline” at live version 595. The browser now confirms every reported orchestration path through its own live feedback text.
