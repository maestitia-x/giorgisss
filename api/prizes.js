import { initDB } from "./_db.js";

export default async function handler(req, res) {
  const db = await initDB();

  if (req.method === "GET") {
    const { rows } = await db.execute('SELECT * FROM prizes ORDER BY "order" ASC');
    return res.json(rows.map(r => ({ ...r, special: !!r.special, weight: r.weight ?? 1 })));
  }

  if (req.method === "POST") {
    const { id, name, order, special, weight } = req.body ?? {};
    if (!name?.trim()) return res.status(400).json({ error: "name is required" });
    const w = Math.max(0.05, Number(weight) || 1);
    await db.execute({
      sql: 'INSERT INTO prizes (id, name, "order", special, weight) VALUES (?, ?, ?, ?, ?)',
      args: [id, name.trim(), order ?? 0, special ? 1 : 0, w],
    });
    return res.json({ ok: true });
  }

  if (req.method === "DELETE") {
    await db.execute("DELETE FROM prizes");
    return res.json({ ok: true });
  }

  res.status(405).json({ error: "Method not allowed" });
}
