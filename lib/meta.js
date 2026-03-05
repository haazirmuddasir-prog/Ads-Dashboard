// lib/meta.js — Meta Marketing API client

const BASE = "https://graph.facebook.com/v19.0";

/**
 * Fetch all ad accounts the user token has access to
 */
export async function getAdAccounts(accessToken) {
  const url = `${BASE}/me/adaccounts?fields=id,name,account_status,currency&limit=50&access_token=${accessToken}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.data; // array of { id, name, account_status, currency }
}

/**
 * Fetch campaign-level insights for a single ad account
 * date_preset: "today" | "yesterday" | "last_7d" | "last_30d" | "this_month"
 */
export async function getAccountInsights(accountId, accessToken, datePreset = "last_7d") {
  const fields = [
    "campaign_name",
    "spend",
    "impressions",
    "clicks",
    "ctr",
    "cpc",
    "cpp",
    "reach",
    "frequency",
    "actions",
    "cost_per_action_type",
    "date_start",
    "date_stop",
  ].join(",");

  const url =
    `${BASE}/${accountId}/insights` +
    `?level=campaign` +
    `&fields=${fields}` +
    `&date_preset=${datePreset}` +
    `&limit=100` +
    `&access_token=${accessToken}`;

  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(`Account ${accountId}: ${data.error.message}`);
  return data.data || [];
}

/**
 * Extract lead count and CPL from the actions/cost_per_action arrays
 */
export function extractLeadMetrics(row) {
  const actions = row.actions || [];
  const costPerAction = row.cost_per_action_type || [];

  const leadAction = actions.find(
    (a) =>
      a.action_type === "lead" ||
      a.action_type === "onsite_conversion.lead_grouped" ||
      a.action_type === "offsite_conversion.fb_pixel_lead"
  );

  const cplAction = costPerAction.find(
    (a) =>
      a.action_type === "lead" ||
      a.action_type === "onsite_conversion.lead_grouped" ||
      a.action_type === "offsite_conversion.fb_pixel_lead"
  );

  const leads = leadAction ? parseFloat(leadAction.value) : 0;
  const cpl = cplAction
    ? parseFloat(cplAction.value)
    : leads > 0
    ? parseFloat(row.spend) / leads
    : 0;

  return { leads, cpl };
}

/**
 * Pull all accounts + their campaign insights in parallel
 * Returns normalized array ready for the dashboard
 */
export async function getAllAccountsData(accessToken, datePreset = "last_7d") {
  const accounts = await getAdAccounts(accessToken);

  const results = await Promise.allSettled(
    accounts.map(async (account) => {
      const insights = await getAccountInsights(account.id, accessToken, datePreset);
      return insights.map((row) => {
        const { leads, cpl } = extractLeadMetrics(row);
        return {
          accountId: account.id,
          accountName: account.name,
          campaign: row.campaign_name,
          spend: parseFloat(row.spend || 0),
          impressions: parseInt(row.impressions || 0),
          clicks: parseInt(row.clicks || 0),
          ctr: parseFloat(row.ctr || 0),
          cpc: parseFloat(row.cpc || 0),
          reach: parseInt(row.reach || 0),
          frequency: parseFloat(row.frequency || 0),
          leads,
          cpl,
          dateStart: row.date_start,
          dateStop: row.date_stop,
        };
      });
    })
  );

  return results
    .filter((r) => r.status === "fulfilled")
    .flatMap((r) => r.value);
}

/**
 * Generate a plain-text daily summary for all campaigns
 */
export function buildDailySummary(campaigns, threshold) {
  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
  const totalLeads = campaigns.reduce((s, c) => s + c.leads, 0);
  const avgCpl = totalLeads > 0 ? totalSpend / totalLeads : 0;
  const spiked = campaigns.filter((c) => c.cpl > threshold && c.leads > 0);

  const lines = [
    `📊 PERSTRIVE DAILY AD REPORT — ${new Date().toDateString()}`,
    ``,
    `OVERVIEW`,
    `• Total Spend:  $${totalSpend.toFixed(2)}`,
    `• Total Leads:  ${totalLeads}`,
    `• Average CPL:  $${avgCpl.toFixed(2)}`,
    `• CPL Threshold: $${threshold}`,
    `• Campaigns:    ${campaigns.length} tracked`,
    ``,
    spiked.length > 0
      ? `⚠️  ${spiked.length} CAMPAIGN(S) ABOVE CPL THRESHOLD:`
      : `✅  All campaigns within CPL threshold`,
    ...spiked.map(
      (c) =>
        `   • [${c.accountName}] ${c.campaign} — CPL $${c.cpl.toFixed(2)} (${c.leads} leads, $${c.spend.toFixed(0)} spent)`
    ),
    ``,
    `ALL CAMPAIGNS`,
    ...campaigns.map(
      (c) =>
        `${c.cpl > threshold ? "🔴" : c.cpl > threshold * 0.8 ? "🟡" : "🟢"} [${c.accountName}] ${c.campaign}` +
        ` | Spend $${c.spend.toFixed(0)} | Leads ${c.leads} | CPL $${c.cpl.toFixed(2)} | CTR ${c.ctr.toFixed(2)}%`
    ),
  ];

  return lines.join("\n");
}
