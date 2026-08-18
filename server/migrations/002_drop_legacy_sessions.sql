-- better-sqlite3-session-store manages its own sessions table with a different schema.
-- Drop any legacy application-managed sessions table so the store can recreate the correct one.
DROP TABLE IF EXISTS sessions;
