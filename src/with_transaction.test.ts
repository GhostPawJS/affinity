import { strictEqual, throws } from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { describe, it } from "node:test";
import { withTransaction } from "./with_transaction.ts";

describe("withTransaction", () => {
  it("commits outer work and rolls back fully on failure", () => {
    const db = new DatabaseSync(":memory:");
    db.exec("CREATE TABLE t (id INTEGER PRIMARY KEY, v INTEGER NOT NULL)");
    withTransaction(db, () => {
      db.prepare("INSERT INTO t (v) VALUES (1)").run();
    });
    strictEqual(
      Number(db.prepare("SELECT COUNT(*) AS c FROM t").get()?.c ?? 0),
      1,
    );

    throws(
      () =>
        withTransaction(db, () => {
          db.prepare("INSERT INTO t (v) VALUES (2)").run();
          throw new Error("boom");
        }),
      /boom/,
    );
    strictEqual(
      Number(db.prepare("SELECT COUNT(*) AS c FROM t").get()?.c ?? 0),
      1,
    );
    db.close();
  });

  it("nested savepoints: inner failure rolls back inner only; outer still commits if inner catches", () => {
    const db = new DatabaseSync(":memory:");
    db.exec("CREATE TABLE t (id INTEGER PRIMARY KEY, v INTEGER NOT NULL)");
    withTransaction(db, () => {
      db.prepare("INSERT INTO t (v) VALUES (1)").run();
      throws(
        () =>
          withTransaction(db, () => {
            db.prepare("INSERT INTO t (v) VALUES (2)").run();
            throw new Error("inner");
          }),
        /inner/,
      );
      db.prepare("INSERT INTO t (v) VALUES (3)").run();
    });
    const rows = db.prepare("SELECT v FROM t ORDER BY v").all() as {
      v: number;
    }[];
    strictEqual(rows.map((r) => r.v).join(","), "1,3");
    db.close();
  });

  it("nested savepoints: outer failure rolls back everything", () => {
    const db = new DatabaseSync(":memory:");
    db.exec("CREATE TABLE t (id INTEGER PRIMARY KEY, v INTEGER NOT NULL)");
    throws(
      () =>
        withTransaction(db, () => {
          db.prepare("INSERT INTO t (v) VALUES (1)").run();
          withTransaction(db, () => {
            db.prepare("INSERT INTO t (v) VALUES (2)").run();
          });
          throw new Error("outer");
        }),
      /outer/,
    );
    strictEqual(
      Number(db.prepare("SELECT COUNT(*) AS c FROM t").get()?.c ?? 0),
      0,
    );
    db.close();
  });
});
