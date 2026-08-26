package failures

import "sort"

type Network struct { Blocked map[string]bool; Partitions map[string]string }
func NewNetwork() *Network { return &Network{Blocked: map[string]bool{}, Partitions: map[string]string{}} }
func key(a, b string) string { pair := []string{a, b}; sort.Strings(pair); return pair[0] + ":" + pair[1] }
func (n *Network) Isolate(a, b string, blocked bool) { n.Blocked[key(a, b)] = blocked }
func (n *Network) Partition(group string, members ...string) { for _, member := range members { n.Partitions[member] = group } }
func (n *Network) Heal() { n.Blocked = map[string]bool{}; n.Partitions = map[string]string{} }
func (n *Network) Connected(a, b string) bool { if n.Blocked[key(a, b)] { return false }; left, right := n.Partitions[a], n.Partitions[b]; return left == "" || right == "" || left == right }
