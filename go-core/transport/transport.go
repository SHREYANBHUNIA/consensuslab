package transport

type MessageKind string
const ( Heartbeat MessageKind = "heartbeat"; RequestVote MessageKind = "request_vote"; Vote MessageKind = "vote"; Append MessageKind = "append_entries"; Ack MessageKind = "append_ack" )
type Message struct { Source string; Target string; Term int; Kind MessageKind; Payload string }
type Link struct { Source string; Target string; Latency int; Loss float64; Enabled bool }
