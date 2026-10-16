-- Keetown backend (Cloudflare D1). Apply: wrangler d1 execute keetown --remote --file schema.sql
CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, mobile TEXT NOT NULL, created INTEGER NOT NULL, expires INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS sessions_mobile ON sessions(mobile);
-- one row per record; a/b = the mobiles allowed to read and change it (owner / tenant, or self)
CREATE TABLE IF NOT EXISTS records (col TEXT NOT NULL, id TEXT NOT NULL, a TEXT, b TEXT, data TEXT NOT NULL, updated INTEGER NOT NULL, PRIMARY KEY (col, id));
CREATE INDEX IF NOT EXISTS records_a ON records(a);
CREATE INDEX IF NOT EXISTS records_b ON records(b);
CREATE TABLE IF NOT EXISTS otp_log (mobile TEXT NOT NULL, ip TEXT, at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS otp_log_m ON otp_log(mobile, at);
CREATE TABLE IF NOT EXISTS otp_codes (mobile TEXT PRIMARY KEY, hash TEXT NOT NULL, expires INTEGER NOT NULL, tries INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS dl_state (state TEXT PRIMARY KEY, verifier TEXT NOT NULL, mobile TEXT NOT NULL, ret TEXT, created INTEGER NOT NULL);
