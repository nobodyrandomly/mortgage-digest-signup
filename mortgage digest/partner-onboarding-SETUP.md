# Partner Onboarding — Setup Guide

Self-service co-branded page creation. An LO shares a private link → partner adds logo + color → their page (`newsdigest.jwhfinance.com/<pagePath>`) goes live instantly → the LO and you get an email alert.

Files: `partner-onboarding-page.html` (drops into the app's `public/`), `partner-onboarding-webhook-code.js` (one n8n Code node), `vercel.json` (already updated with the `/onboard` rewrite).

---

## 1. Cloudinary (logo hosting) — one-time, ~5 min
A dropped logo has to become a stable URL that works in the page *and* the digest emails.
1. Create a free account at cloudinary.com.
2. Dashboard → note your **Cloud name**.
3. Settings → **Upload** → Add an **unsigned** upload preset. Note its name. (Optional: set the preset to limit format to image and cap dimensions.)
4. In `partner-onboarding-page.html`, fill `CLOUDINARY_CLOUD_NAME` and `CLOUDINARY_UPLOAD_PRESET`.

Alternative: Vercel Blob (stay in Vercel). Slightly more code — say the word and I'll swap the upload block.

---

## 2. Google Sheet columns
- **LoanOfficers** tab: add a **`token`** column. Give each active LO a random value (e.g. 16+ chars). The token is the access key in their onboarding link — treat it like a password. (`loEmail` already exists and is the alert recipient.)
- **Partners** tab: no change needed — the webhook writes `partnerId, partnerName, partnerType, partnerColor, partnerLogo, loId, active, pagePath, createdAt`. (`pagePath` was added earlier.)

---

## 3. n8n workflow — `partner-onboard`
Build this small flow (the Code node is `partner-onboarding-webhook-code.js`; fill `ADMIN_EMAIL` and `PAGE_BASE` at its top):

```
Onboard Webhook (POST, path "partner-onboard", Respond = "Using Respond to Webhook node")
  → Read LoanOfficers   (Google Sheets, read all)
  → Read Partners       (Google Sheets, read all)
  → Code: partner-onboard
  → Switch on {{ $json._route }}
       ├ "resolve" → Respond to Webhook   (return: found, loId, loName)
       ├ "error"   → Respond to Webhook   (return: ok, error)
       └ "create"  → Sheets: appendOrUpdate Partners (match column = partnerId)
                     → Gmail: Send a message
                          To      = {{ $json.notifyTo }}
                          Subject = {{ $json.notifySubject }}
                          Message = {{ $json.notifyHtml }}   (Options → set as HTML)
                     → Respond to Webhook  (return ONLY: ok, liveUrl, pagePath, partnerId)
```

Notes:
- The page calls this one webhook twice: `action:"resolve"` on load (to show the LO name + validate the link) and `action:"create"` on submit.
- Keep the **create** Respond trimmed to `ok, liveUrl, pagePath, partnerId` so notification text/recipients aren't returned to the partner's browser.
- The node names above must match exactly — the Code node references `$('Onboard Webhook')`, `$('Read LoanOfficers')`, `$('Read Partners')`.
- Activate the workflow (the page hits the production `/webhook/` URL, which only answers when active).

---

## 4. Deploy + the onboarding link
- Put `partner-onboarding-page.html` in the app's `public/` folder; keep the updated `vercel.json` at the repo root. Commit + push → Vercel deploys.
- Each LO's link: `newsdigest.jwhfinance.com/onboard?t=<their-token>`
- Testing before tokens exist: `…/onboard?lo=bobby-mir` (the `?lo=` fallback resolves by loId; remove reliance on it in production).

---

## 5. Test path
1. `onboard?t=<token>` → shows "Co-branded with <LO name>" and the form.
2. Fill name/type/color, upload a logo, Publish.
3. Expect: a new active Partners row with a generated `partnerId` + `pagePath`; an alert email to the LO + `ADMIN_EMAIL`; the success screen showing the live link.
4. Open `newsdigest.jwhfinance.com/<pagePath>` → the co-branded signup page renders.

---

## IDs are designed so URLs stay clean and routing never breaks
- `partnerId` — minted once (slug + 4 random hex), immutable, the key every other function uses.
- `pagePath` — friendly default slug (deduped if needed), the public URL; **editable later** in the sheet. Changing it changes only the URL (old links stop resolving); nothing downstream moves.

## Not built yet (easy adds)
- Partner-facing onboarding-kit email (their link + QR + preview) fired from the create branch.
- A QR on the success screen.
- New-**subscriber** alert (distinct from this new-**partner** alert) wired into the Signup workflow.
