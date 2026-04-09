import { initDB } from "./_db.js";

export default async function handler(req, res) {
  const db = await initDB();

  if (req.method === "GET") {
    const { rows } = await db.execute('SELECT * FROM prizes ORDER BY "order" ASC');
    return res.json(rows.map(r => ({ ...r, special: !!r.special })));
  }

  if (req.method === "POST") {
    const { id, name, order, special } = req.body ?? {};
    if (!name?.trim()) return res.status(400).json({ error: "name is required" });
    await db.execute({
      sql: 'INSERT INTO prizes (id, name, "order", special) VALUES (?, ?, ?, ?)',
      args: [id, name.trim(), order ?? 0, special ? 1 : 0],
    });
    return res.json({ ok: true });
  }

  if (req.method === "DELETE") {
    await db.execute("DELETE FROM prizes");
    return res.json({ ok: true });
  }

  res.status(405).json({ error: "Method not allowed" });
}
