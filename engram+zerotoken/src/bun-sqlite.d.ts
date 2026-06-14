declare module 'bun:sqlite' {
  class Database {
    constructor(path: string, options?: { create?: boolean; strict?: boolean });
    run(sql: string, ...params: unknown[]): void;
    query(sql: string): Statement;
    close(): void;
  }

  interface Statement {
    all(...params: unknown[]): unknown[];
    get(...params: unknown[]): unknown | undefined;
    run(...params: unknown[]): void;
    values(...params: unknown[]): unknown[][];
  }

  export { Database, Statement };
}
