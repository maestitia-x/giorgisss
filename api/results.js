import { initDB } from "./_db.js";

export default async function handler(req, res) {
  const db = await initDB();

  if (req.method === "GET") {
    const { rows } = await db.execute("SELECT * FROM results ORDER BY spun_at DESC");
    return res.json(rows.map(r => ({
      ...r,
      participantName: r.participant_name,
      prizeName: r.prize_name,
      special: !!r.special,
      spunAt: r.spun_at,
    })));
  }

  if (req.method === "POST") {
    const { id, participantName, prizeName, special, spunAt } = req.body;
    await db.execute({
      sql: "INSERT INTO results (id, participant_name, prize_name, special, spun_at) VALUES (?, ?, ?, ?, ?)",
      args: [id, participantName, prizeName, special ? 1 : 0, spunAt || new Date().toISOString()],
    });
    return res.json({ ok: true });
  }

  if (req.method === "DELETE") {
    await db.execute("DELETE FROM results");
    return res.json({ ok: true });
  }

  res.status(405).json({ error: "Method not allowed" });
}
