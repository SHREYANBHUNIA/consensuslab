package node

type Role string

const ( Follower Role = "follower"; Candidate Role = "candidate"; Leader Role = "leader"; Offline Role = "offline" )

type Entry struct { Index int; Term int; Command string; Committed bool }
type Node struct { ID string; Role Role; Term int; VotedFor string; CommitIndex int; Log []Entry; Alive bool }

func New(id string) *Node { return &Node{ID: id, Role: Follower, Alive: true} }
func (n *Node) LastIndex() int { return len(n.Log) }
func (n *Node) Append(entry Entry) { n.Log = append(n.Log, entry) }
func (n *Node) ReplaceLog(entries []Entry) { n.Log = append([]Entry(nil), entries...) }
func (n *Node) MarkCommitted(index int) { for i := range n.Log { if n.Log[i].Index <= index { n.Log[i].Committed = true } }; if index > n.CommitIndex { n.CommitIndex = index } }
