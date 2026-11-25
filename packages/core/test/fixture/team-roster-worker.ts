import { bindMember, openRosterDatabase } from "../lib/team-roster-sql-probe"

const [filename, rootID, memberID, name] = process.argv.slice(2)
if (!filename || !rootID || !memberID || !name) throw new Error("Missing roster worker arguments")
const db = openRosterDatabase(filename)
try {
  console.log(bindMember(db, rootID, memberID, name))
} finally {
  db.close()
}
