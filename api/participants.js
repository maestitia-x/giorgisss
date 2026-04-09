import { initDB } from "./_db.js";

export default async function handler(req, res) {
  const db = await initDB();

  if (req.method === "GET") {
    const { rows } = await db.execute("SELECT * FROM participants ORDER BY added_at ASC");
    return res.json(rows.map(r => ({ ...r, assignedPrize: r.assigned_prize })));
  }

  if (req.method === "POST") {
    const items = Array.isArray(req.body) ? req.body : [req.body];
    for (const p of items) {
      await db.execute({
        sql: "INSERT INTO participants (id, name, assigned_prize, added_at) VALUES (?, ?, ?, ?)",
        args: [p.id, p.name, p.assignedPrize || "", p.addedAt || new Date().toISOString()],
      });
    }
    return res.json({ ok: true });
  }

  if (req.method === "DELETE") {
    await db.execute("DELETE FROM participants");
    return res.json({ ok: true });
  }

  res.status(405).json({ error: "Method not allowed" });
}
