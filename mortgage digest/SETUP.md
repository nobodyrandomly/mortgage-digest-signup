# Mortgage Digest — Setup Guide

Complete setup takes about 45–60 minutes. Follow steps in order.

---

## What You're Building

- **Landing page** (digest-signup.jsx) — hosted on Vercel, collects subscriber info
- **n8n workflow** — runs daily at 6 AM Eastern, generates digest via Gemini, emails all subscribers
- **Google Sheet** — stores and manages your subscriber list
- **Gmail send-as alias** — emails go out from mortgage-digest@jwhfinance.com

---

## Step 1 — Create Your Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a new spreadsheet
2. Name it: **Mortgage Digest Subscribers**
3. Rename the default sheet tab to: **Subscribers**
4. Add these exact headers in Row 1 (one per column, no spaces):

```
email | firstName | lastName | fullName | company | role | roleOther | phone | subscribedAt | active | send_count | last_sent_at | unsubscribedAt | source
```

5. Copy the Sheet ID from the URL bar:
   - URL looks like: `https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit`
   - Copy the long string between `/d/` and `/edit`
   - You'll paste this into the n8n workflow in Step 4

> Adding new columns later is safe — the workflow reads and writes by header name, not column position.

---

## Step 2 — Set Up Gmail Send-As Alias

1. Open Gmail with the account you'll use to send the digest
2. Click the gear icon → **See all settings**
3. Go to the **Accounts and Import** tab
4. Under **Send mail as**, click **Add another email address**
5. Name: `Mortgage Digest | JWH Finance`
6. Email: `mortgage-digest@jwhfinance.com`
7. Uncheck "Treat as an alias" if you want replies to go to that address
8. Click **Next Step** → **Send Verification**
9. Check the inbox for mortgage-digest@jwhfinance.com and click the verification link
10. Once verified, it appears in your Send mail as list

> You must complete verification before the workflow can send from this address.

---

## Step 3 — Get Your API Keys

### Google Gemini API Key
1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Click **Create API Key**
3. Copy and save it — you'll use it in n8n

### Google Sheets OAuth2 (for n8n)
This is handled via n8n's built-in Google Sheets credential (OAuth2 flow — no manual key needed). You authorize it in Step 4.

---

## Step 4 — Set Up n8n

### 4a. Create Credentials

In n8n go to **Settings → Credentials → Add Credential**:

**Credential 1 — Gemini API**
- Type: `HTTP Query Auth`
- Name: `Google Gemini API Key`
- Name field: `key`
- Value field: your Gemini API key from Step 3

**Credential 2 — Google Sheets**
- Type: `Google Sheets OAuth2 API`
- Name: `Google Sheets (Digest)`
- Click Connect and authorize with your Google account (same one that owns the Sheet)

**Credential 3 — Gmail**
- Type: `Gmail OAuth2`
- Name: `Gmail (Digest Sender)`
- Click Connect and authorize with the Gmail account you set up the send-as alias on

### 4b. Import the Workflow

1. In n8n go to **Workflows → Add Workflow → Import from File**
2. Upload `mortgage-digest-n8n-workflow.json`
3. The workflow opens with all nodes visible

### 4c. Plug In Your Sheet ID

Search for `YOUR_GOOGLE_SHEET_ID` across these four nodes and replace with your actual Sheet ID from Step 1:
- **Fetch Active Subscribers**
- **Save to Google Sheet**
- **Log Send to Sheet**
- **Mark Unsubscribed in Sheet**

### 4d. Get Your Webhook URLs

1. Click the **Signup Webhook** node → copy the Production URL
   - Looks like: `https://your-n8n.com/webhook/digest-signup`
   - Save this — you'll paste it into the landing page in Step 6

2. Click the **Unsubscribe Webhook** node → copy the Production URL
   - Looks like: `https://your-n8n.com/webhook/digest-unsubscribe`

3. Open the **Build HTML Email** node (Code node) and find this line near the top:
   ```
   const UNSUBSCRIBE_WEBHOOK = 'https://YOUR-N8N-INSTANCE/webhook/digest-unsubscribe';
   ```
   Replace with your actual unsubscribe webhook URL.

### 4e. Activate the Workflow

Toggle the workflow to **Active** in the top right. The cron will now fire at 10:00 UTC (6 AM Eastern) every weekday.

---

## Step 5 — Test the Workflow

Before going live, run a manual test:

1. Add your own email as a row in the Google Sheet:
   - Set `active` = `TRUE`, `send_count` = `0`
   - Fill in firstName, lastName, email

2. In n8n, open the workflow and click **Test Workflow**

3. Check that:
   - Gemini generates a digest (Parse node outputs valid JSON with stories)
   - Gmail sends the email to your address
   - The Sheet's `last_sent_at` and `send_count` update
   - The email arrives from `mortgage-digest@jwhfinance.com` with subject and formatting intact

4. Test the unsubscribe link at the bottom of the email — it should open a confirmation page and set your row's `active` to `FALSE`

---

## Step 6 — Deploy the Landing Page

### 6a. Update the Webhook URL

Open `digest-signup.jsx` and find line 5:
```js
const WEBHOOK_URL = "https://YOUR-N8N-INSTANCE/webhook/digest-signup";
```
Replace with your actual signup webhook URL from Step 4d.

### 6b. Deploy to Vercel (Recommended)

**Option A — GitHub (easiest long-term)**
1. Create a new GitHub repo and push `digest-signup.jsx`
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. Vercel auto-detects React. Set framework to **Vite** or **Create React App**
4. Click Deploy
5. Your page is live at `your-project.vercel.app`

**Option B — Vercel CLI (fastest)**
```bash
npm install -g vercel
npx create-react-app mortgage-digest
# Replace src/App.js contents with digest-signup.jsx contents
cd mortgage-digest
vercel deploy
```

**Option C — Netlify Drop**
1. Wrap the component in a standard React app (`create-react-app`)
2. Run `npm run build`
3. Drag the `/build` folder to [app.netlify.com/drop](https://app.netlify.com/drop)
4. Live instantly

### 6c. Custom Domain (Optional)

In Vercel/Netlify, go to Domain Settings and add your domain (e.g. `digest.jwhfinance.com`). Update DNS records as instructed.

---

## Step 7 — Add the Sheet to Your Bookmark Bar

The Google Sheet is your subscriber dashboard. You can:
- See everyone who signed up (name, email, company, role, phone)
- Manually add subscribers by adding rows
- Unsubscribe someone manually by setting `active` = `FALSE`
- Filter by role (loan officer, broker, etc.) for marketing analysis
- Export to CSV anytime

---

## Timezone Reference

| Cron | UTC | Eastern | Central | Pacific |
|------|-----|---------|---------|---------|
| `0 10 * * 1-5` | 10:00 AM | 6:00 AM | 5:00 AM | 3:00 AM |
| `0 11 * * 1-5` | 11:00 AM | 7:00 AM | 6:00 AM | 4:00 AM |
| `0 12 * * 1-5` | 12:00 PM | 8:00 AM | 7:00 AM | 5:00 AM |

Edit the cron expression in the **6 AM Daily** trigger node to change delivery time.

---

## Troubleshooting

**Gemini returns no content**
- Check your API key in the `Google Gemini API Key` credential
- Verify the key is active at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

**Emails not sending from mortgage-digest@jwhfinance.com**
- Confirm the send-as alias is verified in Gmail settings
- In the **Send via Gmail** node options, add `fromEmail: mortgage-digest@jwhfinance.com`

**Sheet not updating**
- Re-authorize the `Google Sheets (Digest)` credential in n8n
- Confirm the Sheet ID is correct and the tab is named exactly `Subscribers`

**Signup form not working**
- Confirm the `WEBHOOK_URL` in `digest-signup.jsx` points to the live n8n webhook (not test URL)
- Make sure the workflow is Active, not just saved

**Unsubscribe link doesn't work**
- Confirm you updated the `UNSUBSCRIBE_WEBHOOK` constant in the Build HTML Email node
- The webhook uses GET method so clicking the link works directly in a browser

---

## Files Reference

| File | Purpose |
|------|---------|
| `mortgage-digest-n8n-workflow.json` | Import into n8n |
| `digest-signup.jsx` | Deploy to Vercel/Netlify |
| `SETUP.md` | This guide |
