package election

import "consensuslab/core/node"

type Result struct { Term int; Candidate string; Votes int; Elected bool }
func Quorum(members int) int { return members/2 + 1 }
func GrantVote(voter *node.Node, candidateID string, term int) bool {
	if !voter.Alive || term < voter.Term { return false }
	if term > voter.Term { voter.Term = term; voter.VotedFor = "" }
	if voter.VotedFor != "" && voter.VotedFor != candidateID { return false }
	voter.VotedFor = candidateID
	return true
}
