# Perstrive Ad Monitor — Setup Guide

Live dashboard pulling all your Meta ad accounts automatically. CPL spike detection, AI diagnosis, daily summary reports.

---

## STEP 1 — Meta Developer App (15 mins)

### 1.1 Create the App
1. Go to **https://developers.facebook.com/apps**
2. Click **Create App**
3. Select **"Other"** → **"Business"**
4. Name it "Perstrive Monitor", link your Business Manager

### 1.2 Add Marketing API Product
1. In your app dashboard → **Add Product**
2. Find **"Marketing API"** → click **Set Up**

### 1.3 Get Your Access Token
1. Go to **https://developers.facebook.com/tools/explorer/**
2. Select your app in the top dropdown
3. Click **"Generate Access Token"**
4. Add these permissions:
   - `ads_read`
   - `ads_management`
   - `business_management`
5. Click **Generate**

### 1.4 Convert to Long-Lived Token (important!)
Short-lived tokens expire in 1 hour. Convert to 60-day token:

```
GET https://graph.facebook.com/v19.0/oauth/access_token
  ?grant_type=fb_exchange_token
  &client_id=YOUR_APP_ID
  &client_secret=YOUR_APP_SECRET
  &fb_exchange_token=YOUR_SHORT_TOKEN
```

Run this in your browser or Postman. Copy the `access_token` from the response.

> **Note:** 60-day tokens still expire. For production, set up a System User token in Meta Business Manager → System Users — these never expire.

### 1.5 Add All Client Ad Accounts
Each client's ad account must grant your app access:
- Go to **Meta Business Manager → Accounts → Ad Accounts**
- For each client account, add your app as a Partner

---

## STEP 2 — Local Setup

```bash
git clone <your-repo>
cd perstrive-monitor
npm install

# Copy env template
cp .env.local.example .env.local
# Fill in your META_ACCESS_TOKEN and ANTHROPIC_API_KEY

npm run dev
# Open http://localhost:3000
```

---

## STEP 3 — Deploy to Vercel

### 3.1 Push to GitHub
```bash
git init
git add .
git commit -m "Initial deploy"
git remote add origin https://github.com/YOUR_USERNAME/perstrive-monitor
git push -u origin main
```

### 3.2 Deploy
1. Go to **https://vercel.com** → New Project
2. Import your GitHub repo
3. Add environment variables:
   - `META_ACCESS_TOKEN` — your long-lived token
   - `ANTHROPIC_API_KEY` — from console.anthropic.com
   - `CPL_THRESHOLD` — e.g. `100`
   - `CRON_SECRET` — any random string for security
4. Click **Deploy**

Your dashboard will be live at `https://your-project.vercel.app`

### 3.3 Daily Report Cron
`vercel.json` is already configured to hit `/api/daily-summary` every day at 7am UTC.

To receive it by email:
1. Sign up at **https://resend.com** (free: 3,000 emails/month)
2. Get your API key
3. Add `RESEND_API_KEY` and `REPORT_EMAIL` to Vercel env vars
4. Uncomment the email block in `pages/api/daily-summary.js`

---

## STEP 4 — Keeping Your Token Fresh

Long-lived tokens expire after 60 days. Two options:

**Option A (Simple):** Set a calendar reminder every 50 days to regenerate via Graph Explorer.

**Option B (Permanent):** Use a Meta System User token:
1. Meta Business Manager → **Settings → Users → System Users**
2. Create a System User → Assign your ad accounts
3. Generate a token with `ads_read` permission — these never expire

---

## File Structure

```
perstrive-monitor/
├── lib/
│   └── meta.js              # Meta API client — all data fetching logic
├── pages/
│   ├── index.js             # Main dashboard UI
│   └── api/
│       ├── accounts.js      # GET /api/accounts — fetches all campaign data
│       ├── diagnose.js      # POST /api/diagnose — AI root cause analysis
│       └── daily-summary.js # GET /api/daily-summary — daily report + cron
├── .env.local.example       # Environment variables template
├── vercel.json              # Cron job config (daily 7am UTC)
└── package.json
```

---

## Adding Email Alerts for CPL Spikes (optional upgrade)

In `pages/api/accounts.js`, after fetching data you can add:

```js
const spiked = data.filter(c => c.cpl > threshold);
if (spiked.length > 0) {
  // send alert email via Resend
}
```

This turns it from a pull dashboard into a push alert system.

---

## Dashboard Features

- **Live data** from all Meta ad accounts via Marketing API
- **Auto-refresh** every 5 minutes
- **CPL threshold** — adjustable, highlights spikes instantly
- **Sortable table** — click any column header
- **AI Diagnosis** — click any campaign to get root cause + 3 fixes
- **Daily Summary** — full text report, copy to clipboard
- **Date range** — Today / Yesterday / Last 7d / Last 30d / This Month
- **Search** — filter by account or campaign name
