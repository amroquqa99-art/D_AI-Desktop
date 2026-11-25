// Fork-only SQLite feasibility probe; no production migrations or public API.
import { Database } from "bun:sqlite"

export const openRosterDatabase = (filename: string) => {
  const db = new Database(filename, { create: false })
  db.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;")
  return db
}

export const installRoster = (db: Database) =>
  db.exec(`
    CREATE TABLE IF NOT EXISTS team_roster_probe (
      root_id TEXT NOT NULL REFERENCES session_v2(id) ON DELETE CASCADE,
      member_id TEXT NOT NULL UNIQUE REFERENCES session_v2(id) ON DELETE CASCADE,
      name TEXT NOT NULL CHECK (
        length(name) BETWEEN 1 AND 48
        AND substr(name, 1, 1) GLOB '[a-z]'
        AND name NOT GLOB '*[^a-z0-9-]*'
      ),
      PRIMARY KEY (root_id, name),
      CHECK (root_id <> member_id)
    );
  `)

// Membership of an existing child only. Creation of the child plus binding it
// to the roster still needs a reviewed transaction/recovery contract.
export const bindMember = (db: Database, rootID: string, memberID: string, name: string) =>
  db.query(`
    INSERT INTO team_roster_probe(root_id, member_id, name)
    SELECT root.id, child.id, ?3
    FROM session_v2 AS root JOIN session_v2 AS child ON child.parent_id = root.id
    WHERE root.id = ?1 AND child.id = ?2
      AND root.parent_id IS NULL AND root.time_archived IS NULL
      AND child.project_id = root.project_id AND child.fork_session_id IS NULL
      AND child.time_archived IS NULL
    ON CONFLICT DO NOTHING
  `).run(rootID, memberID, name).changes

export const listMembers = (db: Database, rootID: string) =>
  db.query<{ name: string; memberID: string }, [string]>(`
    SELECT roster.name, child.id AS memberID
    FROM team_roster_probe AS roster
    JOIN session_v2 AS root ON root.id = roster.root_id
    JOIN session_v2 AS child ON child.id = roster.member_id
    WHERE root.id = ?1 AND root.parent_id IS NULL AND root.time_archived IS NULL
      AND child.parent_id = root.id AND child.project_id = root.project_id
      AND child.fork_session_id IS NULL AND child.time_archived IS NULL
    ORDER BY roster.name
  `).all(rootID)
