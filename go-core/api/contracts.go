package api

import ( "context"; "google.golang.org/grpc" )

// Generated stubs from raft.proto implement this contract at the real gRPC boundary.
type RaftTransportServer interface { RequestVote(context.Context, *RequestVoteRequest) (*RequestVoteResponse, error); AppendEntries(context.Context, *AppendEntriesRequest) (*AppendEntriesResponse, error); Heartbeat(context.Context, *HeartbeatRequest) (*HeartbeatResponse, error) }
type RegisterTransport func(*grpc.Server, RaftTransportServer)
type RequestVoteRequest struct { CandidateID string; Term, LastLogIndex, LastLogTerm int64 }
type RequestVoteResponse struct { Granted bool; Term int64 }
type AppendEntriesRequest struct { LeaderID string; Term, PreviousLogIndex, PreviousLogTerm, LeaderCommit int64; Entries []LogEntry }
type AppendEntriesResponse struct { Accepted bool; Term, MatchIndex int64 }
type HeartbeatRequest struct { LeaderID string; Term, CommitIndex int64 }
type HeartbeatResponse struct { Accepted bool; Term int64 }
type LogEntry struct { Index, Term int64; Command string }
