import { initDB } from "../_db.js";

export default async function handler(req, res) {
  const db = await initDB();
  const { id } = req.query;

  if (req.method === "PUT") {
    const { assignedPrize } = req.body;
    if (assignedPrize !== undefined) {
      await db.execute({ sql: "UPDATE participants SET assigned_prize = ? WHERE id = ?", args: [assignedPrize, id] });
    }
    return res.json({ ok: true });
  }

  if (req.method === "DELETE") {
    await db.execute({ sql: "DELETE FROM participants WHERE id = ?", args: [id] });
    return res.json({ ok: true });
  }

  res.status(405).json({ error: "Method not allowed" });
}
