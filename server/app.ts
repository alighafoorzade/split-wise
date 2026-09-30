import express from "express";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

export function createApp(
  dbPath = process.env.DATABASE_PATH || ".data/expenses.sqlite",
) {
  if (dbPath !== ":memory:")
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(`PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, name TEXT NOT NULL, initials TEXT NOT NULL, color TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS expenses(id TEXT PRIMARY KEY, paidBy TEXT NOT NULL REFERENCES users(id), expenseFor TEXT NOT NULL REFERENCES users(id), cents INTEGER NOT NULL CHECK(cents > 0), description TEXT NOT NULL, date TEXT NOT NULL, CHECK(paidBy <> expenseFor));`);
  if (
    !(db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number }).n
  ) {
    const seed = JSON.parse(fs.readFileSync("server/seed.json", "utf8"));
    db.exec("BEGIN");
    try {
      for (const u of seed.users)
        db.prepare("INSERT INTO users VALUES(?,?,?,?)").run(
          u.id,
          u.name,
          u.initials,
          u.color,
        );
      for (const e of seed.expenses)
        db.prepare("INSERT INTO expenses VALUES(?,?,?,?,?,?)").run(
          e.id,
          e.paidBy,
          e.expenseFor,
          Math.round(e.amount * 100),
          e.description,
          e.date,
        );
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }
  const app = express();
  app.use(express.json({ limit: "16kb" }));
  app.get("/api/health", (_, res) => res.json({ ok: true }));
  app.get("/api/users", (_, res) =>
    res.json(db.prepare("SELECT * FROM users ORDER BY name").all()),
  );
  app.get("/api/expenses", (_, res) =>
    res.json(
      db
        .prepare(
          "SELECT id,paidBy,expenseFor,cents / 100.0 AS amount,description,date FROM expenses ORDER BY date DESC,id DESC",
        )
        .all(),
    ),
  );
  app.get("/api/balances", (_, res) => {
    const rows = db
      .prepare(
        `SELECT MIN(paidBy,expenseFor) AS a, MAX(paidBy,expenseFor) AS b, SUM(CASE WHEN paidBy < expenseFor THEN cents ELSE -cents END) AS net FROM expenses GROUP BY a,b HAVING net <> 0 ORDER BY a,b`,
      )
      .all() as { a: string; b: string; net: number }[];
    res.json(
      rows.map((r) => ({
        from: r.net > 0 ? r.b : r.a,
        to: r.net > 0 ? r.a : r.b,
        amount: Math.abs(r.net) / 100,
      })),
    );
  });
  app.post("/api/expenses", (req, res) => {
    const { paidBy, expenseFor, amount, description } = req.body || {};
    const value = typeof amount === "string" ? amount.trim() : String(amount);
    if (
      typeof paidBy !== "string" ||
      typeof expenseFor !== "string" ||
      paidBy === expenseFor ||
      !/^\d+(\.\d{1,2})?$/.test(value) ||
      Number(value) <= 0 ||
      Number(value) > 1000000 ||
      typeof description !== "string" ||
      !description.trim() ||
      description.trim().length > 200
    ) {
      res
        .status(400)
        .json({
          error:
            "Choose different users, an amount from $0.01 to $1,000,000 (up to two decimals), and a description of 1–200 characters.",
        });
      return;
    }
    if (
      !db.prepare("SELECT id FROM users WHERE id=?").get(paidBy) ||
      !db.prepare("SELECT id FROM users WHERE id=?").get(expenseFor)
    ) {
      res.status(400).json({ error: "Unknown user." });
      return;
    }
    const expense = {
      id: randomUUID(),
      paidBy,
      expenseFor,
      amount: Math.round(Number(value) * 100) / 100,
      description: description.trim(),
      date: new Date().toISOString(),
    };
    db.prepare("INSERT INTO expenses VALUES(?,?,?,?,?,?)").run(
      expense.id,
      paidBy,
      expenseFor,
      Math.round(Number(value) * 100),
      expense.description,
      expense.date,
    );
    res.status(201).json(expense);
  });
  app.delete("/api/expenses/:id", (req, res) => {
    const result = db
      .prepare("DELETE FROM expenses WHERE id=?")
      .run(req.params.id);
    if (!result.changes) {
      res.status(404).json({ error: "Expense not found." });
      return;
    }
    res.status(204).end();
  });
  app.use("/api", (_, res) =>
    res.status(404).json({ error: "Endpoint not found." }),
  );
  const dist = path.resolve("dist");
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get("/{*path}", (_, res) =>
      res.sendFile(path.join(dist, "index.html")),
    );
  }
  app.use(
    (
      err: any,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      const status = err.status === 400 ? 400 : err.status === 413 ? 413 : 500;
      res
        .status(status)
        .json({
          error:
            status === 500 ? "Internal server error." : "Invalid request body.",
        });
    },
  );
  return { app, db };
}
