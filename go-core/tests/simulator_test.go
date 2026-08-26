package tests

import (
	"testing"

	"consensuslab/core/simulator"
)

func TestElectionReplicationAndRecovery(t *testing.T) {
	cluster := simulator.New("node-a", "node-b", "node-c")
	if result := cluster.StartElection("node-a"); !result.Elected {
		t.Fatalf("expected node-a to win a three-node election: %+v", result)
	}
	if !cluster.Append("commit ledger.42") {
		t.Fatal("expected a healthy leader to commit with a majority")
	}
	cluster.Fail("node-c")
	if !cluster.Append("commit ledger.43") {
		t.Fatal("expected a two-node quorum to commit during follower outage")
	}
	cluster.Restore("node-c")
	if !cluster.Consistent() {
		t.Fatal("expected a restored follower to catch up with the leader log")
	}
}

func TestPartitionPreventsSoloCommit(t *testing.T) {
	cluster := simulator.New("node-a", "node-b", "node-c")
	cluster.StartElection("node-a")
	cluster.Network.Partition("left", "node-a")
	cluster.Network.Partition("right", "node-b", "node-c")
	if cluster.Append("must not commit") {
		t.Fatal("isolated leader must not commit without a quorum")
	}
}
