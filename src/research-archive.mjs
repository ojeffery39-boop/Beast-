// Append-only research archive. Requires DATABASE_URL and npm package pg.
// No user prompts, API keys, or chat messages are stored here.
import pg from "pg";
const {Pool}=pg;
export function openArchive(connectionString=process.env.DATABASE_URL) {
  if(!connectionString) throw new Error("DATABASE_URL is required");
  const pool=new Pool({connectionString,ssl:connectionString.includes("localhost")?false:{rejectUnauthorized:false},max:2,connectionTimeoutMillis:5000});
  return {
    async init(){await pool.query(`CREATE TABLE IF NOT EXISTS beast_research_cycles (
      id BIGSERIAL PRIMARY KEY,
      recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      fingerprint TEXT NOT NULL,
      test_set_hash TEXT NOT NULL,
      score INTEGER NOT NULL CHECK (score>=0),
      total INTEGER NOT NULL CHECK (total>0),
      accepted BOOLEAN NOT NULL,
      reason TEXT NOT NULL,
      result JSONB NOT NULL
    )`);await pool.query("CREATE UNIQUE INDEX IF NOT EXISTS beast_research_fingerprint_idx ON beast_research_cycles(fingerprint)")},
    async seen(){const {rows}=await pool.query("SELECT fingerprint FROM beast_research_cycles ORDER BY id DESC LIMIT 1000");return rows.map(r=>r.fingerprint)},
    async baseline(){const {rows}=await pool.query("SELECT COALESCE(MAX(score),0)::integer AS score FROM beast_research_cycles WHERE accepted=true");return {score:rows[0].score}},
    async record(result){const {rows}=await pool.query(`INSERT INTO beast_research_cycles(fingerprint,test_set_hash,score,total,accepted,reason,result)
      VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(fingerprint) DO NOTHING RETURNING id`,
      [result.fingerprint,result.testSetHash,result.score,result.total,result.accepted,result.reason,JSON.stringify(result)]);
      return {stored:rows.length===1,id:rows[0]?.id??null}},
    async latest(){const {rows}=await pool.query("SELECT id,recorded_at,score,total,accepted,reason,fingerprint,test_set_hash FROM beast_research_cycles ORDER BY id DESC LIMIT 20");return rows},
    async close(){await pool.end()}
  };
}
