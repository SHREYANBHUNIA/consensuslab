# Go reference core

This directory contains the executable reference model for the ConsensusLab simulator. The modules map directly to the requested architecture: `node` owns durable local state, `election` governs vote decisions, `replication` applies leader logs to followers, `transport` represents Raft messages and lossy links, `failures` controls partitions and isolation, and `simulator` coordinates a deterministic three-node cluster.

The `api/raft.proto` contract defines `RequestVote`, `AppendEntries`, and `Heartbeat` gRPC operations. In a production deployment, generate the Go stubs with `protoc` plus the Go gRPC plugins, then register a concrete `RaftTransportServer` implementation. The handwritten `contracts.go` documents the exact server boundary until generated code is included in the build.

SQLite run persistence is intentionally isolated in `storage/sqlite.go`. `OpenSQLite` uses the pure-Go `modernc.org/sqlite` driver, while `Initialize` provisions durable `scenarios` and `run_summaries` tables. This keeps simulation storage local to the Go core while the web application uses its managed relational database for multi-viewer synchronization and saved browser-accessible summaries.

Run `go test ./...` from this directory to exercise elections, quorum-safe commits, failure tolerance, recovery catch-up, and partition protection.
