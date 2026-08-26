package replication

import "consensuslab/core/node"

func Sync(leader, follower *node.Node) bool {
	if !leader.Alive || !follower.Alive { return false }
	follower.ReplaceLog(leader.Log)
	follower.Term = leader.Term
	follower.MarkCommitted(leader.CommitIndex)
	return true
}
