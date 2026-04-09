import express from "express";
import cors from "cors";
import db from "./db.js";

const app = express();
app.use(cors());
app.use(express.json());

// ─── PRIZES ───────────────────────────────────────────

app.get("/api/prizes", (req, res) => {
  const rows = db.prepare('SELECT * FROM prizes ORDER BY "order" ASC').all();
  res.json(rows.map(r => ({ ...r, special: !!r.special })));
});

app.post("/api/prizes", (req, res) => {
  const { id, name, order, special } = req.body;
  db.prepare('INSERT INTO prizes (id, name, "order", special) VALUES (?, ?, ?, ?)').run(id, name, order ?? 0, special ? 1 : 0);
  res.json({ ok: true });
});

app.put("/api/prizes/:id", (req, res) => {
  const { name, special } = req.body;
  if (name !== undefined) db.prepare("UPDATE prizes SET name = ? WHERE id = ?").run(name, req.params.id);
  if (special !== undefined) db.prepare("UPDATE prizes SET special = ? WHERE id = ?").run(special ? 1 : 0, req.params.id);
  res.json({ ok: true });
});

app.delete("/api/prizes/:id", (req, res) => {
  db.prepare("DELETE FROM prizes WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

app.delete("/api/prizes", (req, res) => {
  db.prepare("DELETE FROM prizes").run();
  res.json({ ok: true });
});

// ─── PARTICIPANTS ─────────────────────────────────────

app.get("/api/participants", (req, res) => {
  const rows = db.prepare("SELECT * FROM participants ORDER BY added_at ASC").all();
  res.json(rows.map(r => ({ ...r, assignedPrize: r.assigned_prize })));
});

app.post("/api/participants", (req, res) => {
  const insert = db.prepare("INSERT INTO participants (id, name, assigned_prize, added_at) VALUES (?, ?, ?, ?)");
  const items = Array.isArray(req.body) ? req.body : [req.body];
  const tx = db.transaction(() => {
    for (const p of items) {
      insert.run(p.id, p.name, p.assignedPrize || "", p.addedAt || new Date().toISOString());
    }
  });
  tx();
  res.json({ ok: true });
});

app.put("/api/participants/:id", (req, res) => {
  const { assignedPrize } = req.body;
  if (assignedPrize !== undefined) {
    db.prepare("UPDATE participants SET assigned_prize = ? WHERE id = ?").run(assignedPrize, req.params.id);
  }
  res.json({ ok: true });
});

app.delete("/api/participants/:id", (req, res) => {
  db.prepare("DELETE FROM participants WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

app.delete("/api/participants", (req, res) => {
  db.prepare("DELETE FROM participants").run();
  res.json({ ok: true });
});

// ─── RESULTS ──────────────────────────────────────────

app.get("/api/results", (req, res) => {
  const rows = db.prepare("SELECT * FROM results ORDER BY spun_at DESC").all();
  res.json(rows.map(r => ({
    ...r,
    participantName: r.participant_name,
    prizeName: r.prize_name,
    special: !!r.special,
    spunAt: r.spun_at,
  })));
});

app.post("/api/results", (req, res) => {
  const { id, participantName, prizeName, special, spunAt } = req.body;
  db.prepare("INSERT INTO results (id, participant_name, prize_name, special, spun_at) VALUES (?, ?, ?, ?, ?)")
    .run(id, participantName, prizeName, special ? 1 : 0, spunAt || new Date().toISOString());
  res.json({ ok: true });
});

app.delete("/api/results", (req, res) => {
  db.prepare("DELETE FROM results").run();
  res.json({ ok: true });
});

// ─── START ────────────────────────────────────────────

const PORT = 3001;
app.listen(PORT, () => console.log(`API server running on http://localhost:${PORT}`));
