package simulator

import (
	"consensuslab/core/election"
	"consensuslab/core/failures"
	"consensuslab/core/node"
	"consensuslab/core/replication"
)

type Cluster struct { Nodes map[string]*node.Node; Network *failures.Network; Term int; LeaderID string }
func New(ids ...string) *Cluster { nodes := make(map[string]*node.Node, len(ids)); for _, id := range ids { nodes[id] = node.New(id) }; return &Cluster{Nodes: nodes, Network: failures.NewNetwork()} }
func (c *Cluster) Quorum() int { return election.Quorum(len(c.Nodes)) }
func (c *Cluster) StartElection(candidateID string) election.Result {
	candidate := c.Nodes[candidateID]; if candidate == nil || !candidate.Alive { return election.Result{Candidate: candidateID} }
	c.Term++; c.LeaderID = ""; candidate.Role = node.Candidate; candidate.Term = c.Term; candidate.VotedFor = candidateID; votes := 1
	for id, voter := range c.Nodes { if id == candidateID || !c.Network.Connected(candidateID, id) { continue }; if election.GrantVote(voter, candidateID, c.Term) { votes++ } }
	result := election.Result{Term: c.Term, Candidate: candidateID, Votes: votes, Elected: votes >= c.Quorum()}; if result.Elected { candidate.Role = node.Leader; c.LeaderID = candidateID }; return result
}
func (c *Cluster) Append(command string) bool {
	leader := c.Nodes[c.LeaderID]; if leader == nil || !leader.Alive || leader.Role != node.Leader { return false }
	entry := node.Entry{Index: leader.LastIndex() + 1, Term: c.Term, Command: command}; leader.Append(entry); acks := 1
	for id, follower := range c.Nodes { if id != leader.ID && c.Network.Connected(leader.ID, id) && replication.Sync(leader, follower) { acks++ } }
	if acks < c.Quorum() { return false }; leader.MarkCommitted(entry.Index); for _, peer := range c.Nodes { if peer.Alive && c.Network.Connected(leader.ID, peer.ID) { peer.MarkCommitted(entry.Index) } }; return true
}
func (c *Cluster) Fail(id string) { if n := c.Nodes[id]; n != nil { n.Alive = false; n.Role = node.Offline; if c.LeaderID == id { c.LeaderID = "" } } }
func (c *Cluster) Restore(id string) { n, leader := c.Nodes[id], c.Nodes[c.LeaderID]; if n == nil { return }; n.Alive = true; n.Role = node.Follower; if leader != nil && c.Network.Connected(leader.ID, id) { replication.Sync(leader, n) } }
func (c *Cluster) Consistent() bool { leader := c.Nodes[c.LeaderID]; if leader == nil { return true }; for _, peer := range c.Nodes { if !peer.Alive { continue }; for index := 0; index < leader.CommitIndex; index++ { if len(peer.Log) <= index || peer.Log[index].Term != leader.Log[index].Term || peer.Log[index].Command != leader.Log[index].Command { return false } } }; return true }
