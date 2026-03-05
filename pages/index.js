// pages/index.js — Perstrive Ad Monitor Dashboard

import { useState, useEffect, useCallback } from "react";

const DATE_PRESETS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_7d", label: "Last 7 Days" },
  { value: "last_30d", label: "Last 30 Days" },
  { value: "this_month", label: "This Month" },
];

const fmt$ = (n) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtK = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

function StatusBadge({ cpl, threshold }) {
  const spiked = cpl > threshold;
  const warn = cpl > threshold * 0.8;
  const cfg = spiked
    ? { label: "SPIKE", bg: "#3f0e0e", color: "#f87171", dot: "#ef4444" }
    : warn
    ? { label: "WATCH", bg: "#3b2700", color: "#fbbf24", dot: "#f59e0b" }
    : { label: "GOOD", bg: "#082310", color: "#4ade80", dot: "#22c55e" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 10, fontWeight: 800, letterSpacing: "0.8px",
      padding: "3px 9px", borderRadius: 20,
      background: cfg.bg, color: cfg.color,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.dot, display: "inline-block" }} />
      {cfg.label}
    </span>
  );
}

function KpiCard({ label, value, sub, color, pulse }) {
  return (
    <div style={{
      background: "#13131e", border: "1px solid #1e1e2e",
      borderRadius: 12, padding: "16px 20px",
      position: "relative", overflow: "hidden",
    }}>
      {pulse && (
        <div style={{
          position: "absolute", top: 10, right: 10,
          width: 8, height: 8, borderRadius: "50%",
          background: "#ef4444",
          boxShadow: "0 0 0 3px rgba(239,68,68,0.25)",
          animation: "pulse 2s infinite",
        }} />
      )}
      <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color: color || "#e2e8f0", letterSpacing: "-1px", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#475569", marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function DiagnosisPanel({ row, threshold, onClose }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const run = useCallback(async () => {
    setLoading(true);
    setText("");
    try {
      const res = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ row, threshold }),
      });
      const json = await res.json();
      setText(json.diagnosis || "No response.");
    } catch {
      setText("Error fetching diagnosis.");
    }
    setLoading(false);
  }, [row, threshold]);

  useEffect(() => { run(); }, [run]);

  const lines = text.split("\n").map((line, i) => {
    const isBold = line.startsWith("**") && line.includes("**", 2);
    return isBold ? (
      <div key={i} style={{ fontWeight: 700, color: "#f1f5f9", marginTop: i > 0 ? 14 : 0, marginBottom: 2, fontSize: 12 }}>
        {line.replace(/\*\*/g, "")}
      </div>
    ) : line.trim() ? (
      <div key={i} style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.7 }}>{line}</div>
    ) : null;
  });

  return (
    <div style={{
      background: "#0f0f1a", border: "1px solid #1e1e2e",
      borderRadius: 12, padding: 20, position: "sticky", top: 20,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 9, color: "#475569", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 4 }}>AI Diagnosis</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", maxWidth: 280 }}>{row.campaign}</div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{row.accountName}</div>
        </div>
        <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#475569", cursor: "pointer", fontSize: 22, lineHeight: 1, padding: 0 }}>×</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
        {[
          ["Spend", fmt$(row.spend)],
          ["Leads", row.leads],
          ["CPL", fmt$(row.cpl)],
          ["CTR", `${(row.ctr || 0).toFixed(2)}%`],
          ["CPC", fmt$(row.cpc)],
          ["Impressions", fmtK(row.impressions)],
        ].map(([k, v]) => (
          <div key={k} style={{ background: "#13131e", borderRadius: 6, padding: "8px 10px" }}>
            <div style={{ fontSize: 9, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>{k}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0" }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ borderTop: "1px solid #1e1e2e", paddingTop: 16 }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "28px 0", color: "#475569" }}>
            <div style={{ fontSize: 26, marginBottom: 8 }}>🔄</div>
            <div style={{ fontSize: 12 }}>Analyzing with Claude AI...</div>
          </div>
        ) : (
          <div>{lines}</div>
        )}
      </div>

      <button onClick={run} style={{
        marginTop: 16, width: "100%", background: "#1e293b",
        color: "#94a3b8", border: "1px solid #2d3748",
        borderRadius: 8, padding: "8px 0", fontSize: 12,
        fontWeight: 600, cursor: "pointer",
      }}>↺ Re-analyze</button>
    </div>
  );
}

export default function Dashboard() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastFetch, setLastFetch] = useState(null);
  const [threshold, setThreshold] = useState(100);
  const [datePreset, setDatePreset] = useState("last_7d");
  const [selected, setSelected] = useState(null);
  const [sortBy, setSortBy] = useState("cpl");
  const [sortDir, setSortDir] = useState("desc");
  const [search, setSearch] = useState("");
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summary, setSummary] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/accounts?datePreset=${datePreset}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setCampaigns(json.data || []);
      setLastFetch(new Date(json.fetchedAt));
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }, [datePreset]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const fetchSummary = async () => {
    setSummaryOpen(true);
    setSummaryLoading(true);
    try {
      const res = await fetch("/api/daily-summary");
      const json = await res.json();
      setSummary(json.summary || "No summary available.");
    } catch {
      setSummary("Error generating summary.");
    }
    setSummaryLoading(false);
  };

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
  };

  const filtered = campaigns
    .filter(c => !search || c.accountName?.toLowerCase().includes(search.toLowerCase()) || c.campaign?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const v = (x) => x[sortBy] || 0;
      return sortDir === "desc" ? v(b) - v(a) : v(a) - v(b);
    });

  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
  const totalLeads = campaigns.reduce((s, c) => s + c.leads, 0);
  const avgCpl = totalLeads > 0 ? totalSpend / totalLeads : 0;
  const spiked = campaigns.filter(c => c.cpl > threshold && c.leads > 0);
  const accounts = [...new Set(campaigns.map(c => c.accountName))];

  const cplColor = (cpl) => cpl > threshold ? "#f87171" : cpl > threshold * 0.8 ? "#fbbf24" : "#4ade80";

  const ColHead = ({ col, label }) => (
    <th onClick={() => handleSort(col)} style={{
      padding: "9px 12px", textAlign: "right",
      color: sortBy === col ? "#e2e8f0" : "#475569",
      fontWeight: sortBy === col ? 700 : 600,
      fontSize: 10, textTransform: "uppercase", letterSpacing: "0.8px",
      cursor: "pointer", userSelect: "none", whiteSpace: "nowrap",
    }}>
      {label} {sortBy === col ? (sortDir === "desc" ? "↓" : "↑") : ""}
    </th>
  );

  return (
    <div style={{
      fontFamily: "'DM Mono', 'Fira Code', 'Courier New', monospace",
      background: "#080810",
      minHeight: "100vh",
      color: "#e2e8f0",
      padding: "24px",
    }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: #0d0d14; }
        ::-webkit-scrollbar-thumb { background: #2d2d3d; border-radius: 2px; }
        tr:hover td { background: rgba(255,255,255,0.02); }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
            <div style={{ width: 36, height: 36, background: "#dc2626", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>⚡</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-1px" }}>PERSTRIVE AD MONITOR</h1>
              <div style={{ fontSize: 11, color: "#334155", marginTop: 1 }}>
                {accounts.length} accounts · {campaigns.length} campaigns
                {lastFetch && ` · synced ${lastFetch.toLocaleTimeString()}`}
                {" · "}auto-refreshes every 5 min
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {/* Date preset */}
          <select
            value={datePreset}
            onChange={e => setDatePreset(e.target.value)}
            style={{
              background: "#13131e", border: "1px solid #1e1e2e",
              color: "#e2e8f0", borderRadius: 8, padding: "7px 12px",
              fontSize: 12, fontWeight: 600, cursor: "pointer", outline: "none",
            }}
          >
            {DATE_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>

          {/* CPL threshold */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#13131e", border: "1px solid #1e1e2e", borderRadius: 8, padding: "7px 14px" }}>
            <span style={{ fontSize: 11, color: "#475569" }}>CPL ALERT $</span>
            <input
              type="number"
              value={threshold}
              onChange={e => setThreshold(Number(e.target.value))}
              style={{ width: 55, background: "transparent", border: "none", color: "#f87171", fontSize: 15, fontWeight: 900, outline: "none" }}
            />
          </div>

          <button onClick={fetchSummary} style={{
            background: "#1e293b", color: "#94a3b8", border: "1px solid #2d3748",
            borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}>
            📋 Daily Summary
          </button>

          <button onClick={fetchData} disabled={loading} style={{
            background: "#dc2626", color: "#fff", border: "none",
            borderRadius: 8, padding: "8px 18px", fontSize: 12, fontWeight: 700, cursor: "pointer",
            opacity: loading ? 0.6 : 1,
          }}>
            {loading ? "⟳ Syncing..." : "↺ Refresh"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: "#1f0808", border: "1px solid #7f1d1d", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "#fca5a5" }}>
          ⚠️ {error}
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 16 }}>
        <KpiCard label="Total Spend" value={fmt$(totalSpend)} color="#818cf8" />
        <KpiCard label="Total Leads" value={totalLeads} color="#34d399" />
        <KpiCard label="Avg CPL" value={fmt$(avgCpl)} color={cplColor(avgCpl)} />
        <KpiCard label="Accounts" value={accounts.length} color="#94a3b8" />
        <KpiCard label="CPL Spikes" value={spiked.length} color={spiked.length > 0 ? "#f87171" : "#34d399"} pulse={spiked.length > 0} sub={spiked.length > 0 ? spiked.map(c => c.accountName).join(", ") : "All clear"} />
      </div>

      {/* Spike alert */}
      {spiked.length > 0 && (
        <div style={{ background: "#1a0808", border: "1px solid #7f1d1d", borderRadius: 10, padding: "10px 16px", marginBottom: 14, display: "flex", alignItems: "flex-start", gap: 10 }}>
          <span style={{ fontSize: 16, marginTop: 1 }}>🚨</span>
          <div style={{ fontSize: 12, color: "#fca5a5", lineHeight: 1.7 }}>
            <strong>{spiked.length} campaign{spiked.length > 1 ? "s" : ""} above ${threshold} CPL threshold</strong><br />
            {spiked.map(c => `[${c.accountName}] ${c.campaign} — $${c.cpl.toFixed(2)}`).join(" · ")}
          </div>
        </div>
      )}

      {/* Search */}
      <div style={{ marginBottom: 12 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search accounts or campaigns..."
          style={{
            background: "#13131e", border: "1px solid #1e1e2e",
            color: "#e2e8f0", borderRadius: 8, padding: "8px 14px",
            fontSize: 12, outline: "none", width: 300,
          }}
        />
      </div>

      {/* Main layout */}
      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 380px" : "1fr", gap: 14, alignItems: "start" }}>

        {/* Table */}
        <div style={{ background: "#0d0d18", border: "1px solid #1a1a27", borderRadius: 12, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1a1a27" }}>
                <th style={{ padding: "9px 12px", textAlign: "left", color: "#475569", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.8px" }}> </th>
                <th style={{ padding: "9px 12px", textAlign: "left", color: "#475569", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.8px" }}>Account</th>
                <th style={{ padding: "9px 12px", textAlign: "left", color: "#475569", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.8px" }}>Campaign</th>
                <ColHead col="spend" label="Spend" />
                <ColHead col="leads" label="Leads" />
                <ColHead col="cpl" label="CPL" />
                <ColHead col="ctr" label="CTR" />
                <ColHead col="cpc" label="CPC" />
                <ColHead col="impressions" label="Impr." />
                <th style={{ padding: "9px 12px", textAlign: "right", color: "#475569", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.8px" }}> </th>
              </tr>
            </thead>
            <tbody>
              {loading && campaigns.length === 0 ? (
                <tr><td colSpan={10} style={{ padding: "40px", textAlign: "center", color: "#475569", fontSize: 13 }}>⟳ Loading campaign data from Meta API...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={10} style={{ padding: "40px", textAlign: "center", color: "#475569", fontSize: 13 }}>No campaigns found</td></tr>
              ) : filtered.map((row, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #111119", background: selected === row ? "#0f0f20" : "transparent" }}>
                  <td style={{ padding: "10px 12px" }}><StatusBadge cpl={row.cpl} threshold={threshold} /></td>
                  <td style={{ padding: "10px 12px", color: "#64748b", fontWeight: 500, whiteSpace: "nowrap" }}>{row.accountName}</td>
                  <td style={{ padding: "10px 12px", color: "#e2e8f0", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.campaign}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", color: "#818cf8", fontWeight: 700 }}>{fmt$(row.spend)}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", color: "#34d399", fontWeight: 700 }}>{row.leads}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 900, color: cplColor(row.cpl), fontSize: 13 }}>{fmt$(row.cpl)}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", color: "#64748b" }}>{(row.ctr || 0).toFixed(2)}%</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", color: "#64748b" }}>{fmt$(row.cpc)}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", color: "#475569" }}>{fmtK(row.impressions)}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <button
                      onClick={() => setSelected(selected === row ? null : row)}
                      style={{
                        background: row.cpl > threshold ? "#7f1d1d" : "#1e293b",
                        color: row.cpl > threshold ? "#fca5a5" : "#94a3b8",
                        border: "none", borderRadius: 6,
                        padding: "4px 10px", fontSize: 10, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
                      }}>
                      {selected === row ? "Close" : row.cpl > threshold ? "🔍 Diagnose" : "Analyze"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Diagnosis panel */}
        {selected && (
          <DiagnosisPanel row={selected} threshold={threshold} onClose={() => setSelected(null)} />
        )}
      </div>

      {/* Daily Summary Modal */}
      {summaryOpen && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
        }} onClick={() => setSummaryOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "#0d0d18", border: "1px solid #1e1e2e",
            borderRadius: 12, padding: 24, width: "90%", maxWidth: 680,
            maxHeight: "80vh", overflow: "auto",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>📋 Daily Summary Report</div>
              <button onClick={() => setSummaryOpen(false)} style={{ background: "transparent", border: "none", color: "#475569", cursor: "pointer", fontSize: 22, lineHeight: 1 }}>×</button>
            </div>
            {summaryLoading ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#475569", fontSize: 13 }}>Generating summary...</div>
            ) : (
              <pre style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.8, whiteSpace: "pre-wrap", margin: 0 }}>{summary}</pre>
            )}
            {!summaryLoading && summary && (
              <button
                onClick={() => navigator.clipboard.writeText(summary)}
                style={{ marginTop: 16, background: "#1e293b", color: "#94a3b8", border: "1px solid #2d3748", borderRadius: 8, padding: "8px 16px", fontSize: 12, cursor: "pointer" }}>
                Copy to clipboard
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
