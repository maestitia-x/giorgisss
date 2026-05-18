import { initDB } from "../_db.js";

export default async function handler(req, res) {
  const db = await initDB();
  const { id } = req.query;

  if (req.method === "PUT") {
    const { name, special, weight } = req.body;
    if (name !== undefined) {
      await db.execute({ sql: "UPDATE prizes SET name = ? WHERE id = ?", args: [name, id] });
    }
    if (special !== undefined) {
      await db.execute({ sql: "UPDATE prizes SET special = ? WHERE id = ?", args: [special ? 1 : 0, id] });
    }
    if (weight !== undefined) {
      const w = Math.max(0.05, Number(weight) || 1);
      await db.execute({ sql: "UPDATE prizes SET weight = ? WHERE id = ?", args: [w, id] });
    }
    return res.json({ ok: true });
  }

  if (req.method === "DELETE") {
    await db.execute({ sql: "DELETE FROM prizes WHERE id = ?", args: [id] });
    return res.json({ ok: true });
  }

  res.status(405).json({ error: "Method not allowed" });
}
