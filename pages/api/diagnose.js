// pages/api/diagnose.js
// Proxies diagnosis requests through the server so the Anthropic API key stays secret

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { row, threshold } = req.body;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY not set." });

  const prompt = `You are a Meta Ads performance analyst for Perstrive, a concrete coating & epoxy flooring lead gen agency managing 10+ client markets.

Campaign metrics:
- Account/Market: ${row.accountName}
- Campaign: ${row.campaign}
- Spend: $${(row.spend || 0).toFixed(2)}
- Leads: ${row.leads}
- CPL: $${(row.cpl || 0).toFixed(2)} (alert threshold: $${threshold})
- CTR: ${(row.ctr || 0).toFixed(2)}%
- CPC: $${(row.cpc || 0).toFixed(2)}
- Impressions: ${row.impressions}
- Reach: ${row.reach}
- Frequency: ${(row.frequency || 0).toFixed(2)}

Diagnose why CPL ${row.cpl > threshold ? "is above threshold" : "is at this level"} and give 3 specific, actionable fixes for a home service lead gen campaign targeting homeowners interested in concrete coating / epoxy flooring.

Use this exact format:

**DIAGNOSIS**
[2-3 sentences identifying the root cause based on the specific metrics above]

**FIX 1: [Short Title]**
[One specific action to take]

**FIX 2: [Short Title]**
[One specific action to take]

**FIX 3: [Short Title]**
[One specific action to take]`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 700,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    return res.status(200).json({ diagnosis: data.content?.[0]?.text || "No response." });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
