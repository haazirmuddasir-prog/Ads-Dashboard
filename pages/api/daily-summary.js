// pages/api/daily-summary.js
// Hit by Vercel Cron daily at 7am. Generates summary and optionally emails it.
// Vercel cron config in vercel.json will call GET /api/daily-summary

import { getAllAccountsData, buildDailySummary } from "../../lib/meta";

export default async function handler(req, res) {
  // Protect endpoint — only allow Vercel cron or your own calls
  const cronSecret = req.headers["x-cron-secret"];
  if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const accessToken = process.env.META_ACCESS_TOKEN;
  const threshold = parseFloat(process.env.CPL_THRESHOLD || "100");

  if (!accessToken) {
    return res.status(500).json({ error: "META_ACCESS_TOKEN not set." });
  }

  try {
    const campaigns = await getAllAccountsData(accessToken, "yesterday");
    const summary = buildDailySummary(campaigns, threshold);

    // --- Optional: send via email using Resend (free tier: 3k emails/month) ---
    // Uncomment and set RESEND_API_KEY + REPORT_EMAIL in your .env to enable
    /*
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "reports@yourdomain.com",
      to: process.env.REPORT_EMAIL,
      subject: `Perstrive Daily Ad Report — ${new Date().toDateString()}`,
      text: summary,
    });
    */

    console.log("Daily summary generated:\n", summary);

    return res.status(200).json({
      success: true,
      summary,
      campaignCount: campaigns.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Daily summary error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
