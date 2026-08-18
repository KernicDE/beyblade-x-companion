declare module 'better-sqlite3-session-store' {
  import type { Store } from 'express-session';
  import type Database from 'better-sqlite3';

  interface BetterSqlite3SessionStoreOptions {
    client: Database.Database;
    expired?: {
      clear?: boolean;
      intervalMs?: number;
    };
  }

  class BetterSqlite3SessionStore extends Store {
    constructor(options: BetterSqlite3SessionStoreOptions);
  }

  function createSqliteStore(session: { Store: typeof Store }): typeof BetterSqlite3SessionStore;

  export default createSqliteStore;
}
