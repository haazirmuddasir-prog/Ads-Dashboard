// pages/api/accounts.js
// Called by the frontend to pull live Meta data

import { getAllAccountsData } from "../../lib/meta";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const accessToken = process.env.META_ACCESS_TOKEN;
  if (!accessToken) {
    return res.status(500).json({ error: "META_ACCESS_TOKEN not set in environment variables." });
  }

  const datePreset = req.query.datePreset || "last_7d";

  try {
    const data = await getAllAccountsData(accessToken, datePreset);
    return res.status(200).json({ data, fetchedAt: new Date().toISOString() });
  } catch (err) {
    console.error("Meta API error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
