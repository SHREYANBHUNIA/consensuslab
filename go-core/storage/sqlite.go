package storage

import ( "database/sql"; _ "modernc.org/sqlite" )

func OpenSQLite(path string) (*sql.DB, error) { return sql.Open("sqlite", path) }
func Initialize(db *sql.DB) error {
	_, err := db.Exec(`CREATE TABLE IF NOT EXISTS scenarios (id TEXT PRIMARY KEY, name TEXT NOT NULL, configuration TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP); CREATE TABLE IF NOT EXISTS run_summaries (id TEXT PRIMARY KEY, scenario_id TEXT, summary TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);`)
	return err
}

