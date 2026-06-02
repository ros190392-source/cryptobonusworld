# SEO Email Intake Pipeline — Setup Guide

Automatically routes SEO alert emails from Google Search Console, Yandex Webmaster,
Bing Webmaster, Yandex Metrika, GA4, and Clarity into structured JSON files in
the GitHub repository, where Claude can process them via `seo-issue-intake.mjs`.

## Architecture

```
SEO Tool → Gmail (label: SEO-Issues)
         → Google Apps Script (every 30 min)
         → GitHub API (PUT /contents/data/seo-issues/inbox/{file}.json)
         → git pull / npm run seo:intake
         → reports/seo-issue-queue.md + reports/seo-issue-queue.json
```

---

## Step 1 — Create Gmail Labels

You need two labels in Gmail:

| Label | Purpose |
|-------|---------|
| `SEO-Issues` | Incoming unprocessed alerts |
| `SEO-Issues/Processed` | After Apps Script runs |

**To create labels:**
1. Open [Gmail](https://mail.google.com)
2. Click the gear icon → **See all settings**
3. Go to **Labels** tab → **Create new label**
4. Create `SEO-Issues`
5. Create `SEO-Issues/Processed` — Gmail treats `/` as a nested label automatically

Or run the helper function in Apps Script once:
```
createLabels()   ← run from Apps Script editor
```

---

## Step 2 — Create Gmail Filters

Route all SEO tool emails to the `SEO-Issues` label automatically.

### Google Search Console
- **From:** `sc-noreply@google.com` OR `searchconsole-noreply@google.com`
- **Action:** Apply label `SEO-Issues`, Skip Inbox

### Yandex Webmaster
- **From:** `webmaster@yandex.ru` OR `noreply@webmaster.yandex.ru`
- **Action:** Apply label `SEO-Issues`, Skip Inbox

### Bing Webmaster
- **From:** `webmaster@bing.com`
- **Action:** Apply label `SEO-Issues`, Skip Inbox

### Yandex Metrika
- **From:** `metrika@yandex.ru`
- **Action:** Apply label `SEO-Issues`, Skip Inbox

### GA4
- **From:** `analytics-noreply@google.com`
- **Action:** Apply label `SEO-Issues`, Skip Inbox

### Microsoft Clarity
- **From:** `clarity@microsoft.com` OR `noreply@clarity.microsoft.com`
- **Action:** Apply label `SEO-Issues`, Skip Inbox

**To create a filter in Gmail:**
1. Settings → **Filters and Blocked Addresses** → **Create a new filter**
2. In the **From** field enter the sender address
3. Click **Create filter**
4. Check **Skip the Inbox (Archive it)** + **Apply the label: SEO-Issues**
5. Check **Also apply filter to matching conversations**
6. Click **Create filter**

---

## Step 3 — Create GitHub Personal Access Token

The script pushes files to your repo via the GitHub Contents API.

1. Go to [GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens](https://github.com/settings/tokens?type=beta)
2. Click **Generate new token**
3. Name: `CryptoBonusWorld SEO Intake`
4. Expiration: 90 days (or custom)
5. Repository access: **Only select repositories** → `CryptoBonusWorld`
6. Permissions:
   - **Contents** → Read and Write
   - Everything else: No access
7. Click **Generate token**
8. **Copy the token immediately** — you won't see it again

---

## Step 4 — Create the Google Apps Script Project

1. Go to [script.google.com](https://script.google.com)
2. Click **New project**
3. Name it: `CryptoBonusWorld SEO Email Intake`
4. Delete the default `myFunction()` code
5. Paste the entire contents of `scripts/google-apps-script/seo-email-intake.gs`
6. Click **Save** (Ctrl+S)

---

## Step 5 — Add Script Properties (Secrets)

**Never hardcode secrets in the script. Use Script Properties.**

1. In the Apps Script editor: click the gear icon (**Project Settings**)
2. Scroll to **Script Properties**
3. Click **Add script property** for each:

| Property | Value | Example |
|----------|-------|---------|
| `GITHUB_TOKEN` | Your fine-grained token from Step 3 | `github_pat_...` |
| `GITHUB_OWNER` | Your GitHub username | `yourusername` |
| `GITHUB_REPO` | Repository name | `CryptoBonusWorld` |
| `GITHUB_BRANCH` | Branch to push to | `main` |
| `MAX_PER_RUN` | Max emails per trigger run | `20` |

> **Security note:** Script Properties are stored encrypted by Google and are never
> visible in the script source code. They are accessible only to you and editors
> of this Apps Script project. Do not share the project with untrusted parties.

---

## Step 6 — Authorize the Script

The script needs permissions to access Gmail and make HTTP requests.

1. In the Apps Script editor, select function `createLabels` from the dropdown
2. Click **Run**
3. A permissions dialog will appear — click **Review permissions**
4. Choose your Google account
5. Click **Advanced** → **Go to CryptoBonusWorld SEO Email Intake (unsafe)**
   *(This is expected for personal scripts not published to marketplace)*
6. Click **Allow**

Permissions granted:
- `https://mail.google.com/` — Read/label/modify Gmail
- `https://www.googleapis.com/auth/script.external_request` — Call GitHub API

---

## Step 7 — Test the Setup

Run the test function before enabling the trigger:

1. In Apps Script editor, select `testIntake` from the function dropdown
2. Click **Run**
3. Click **Execution log** to see results

**Expected output:**
```
Testing GitHub connection...
Owner: yourusername
Repo:  CryptoBonusWorld
Branch: main
✅ TEST PASSED — file created at: data/seo-issues/inbox/TEST-intake-YYYYMMDD-HHmmss.json
   Delete it from the repo: git rm data/seo-issues/inbox/TEST-intake-...json
```

If you see `❌ TEST FAILED`:
- Check that `GITHUB_TOKEN` has Contents: Read/Write permission
- Verify `GITHUB_OWNER` and `GITHUB_REPO` match your actual repo
- Ensure the token hasn't expired

**After test:** delete the test file from the repo:
```bash
git pull
git rm data/seo-issues/inbox/TEST-intake-*.json
git commit -m "chore: remove Apps Script intake test file"
git push
```

---

## Step 8 — Schedule the Trigger (every 30 minutes)

1. In Apps Script editor, click the **clock icon** (Triggers) in the left sidebar
2. Click **+ Add Trigger** (bottom right)
3. Configure:
   - **Function to run:** `processSeoEmails`
   - **Deployment:** Head
   - **Event source:** Time-driven
   - **Type:** Minutes timer
   - **Interval:** Every 30 minutes
4. Click **Save**

The script will now automatically run every 30 minutes.

---

## Processing the Intake

After new issues are pushed to `data/seo-issues/inbox/`:

```bash
# Pull the new issue files
git pull

# View the issue queue (includes inbox)
npm run seo:intake

# View only new/open issues
npm run seo:intake:open

# View as JSON for scripting
npm run seo:intake:json

# Filter to critical issues only
npm run seo:intake:critical
```

Reports are generated to:
- `reports/seo-issue-queue.md` — human-readable queue
- `reports/seo-issue-queue.json` — machine-readable

---

## Manual Issue Entry

If you want to add an issue without waiting for an email, drop a JSON file directly:

```bash
# Create a manual issue
cat > data/seo-issues/manual/2026-06-02-slow-homepage.json << 'EOF'
{
  "id": "manual:2026-06-02-slow-homepage",
  "source": "manual",
  "issueType": "core-web-vitals:lcp",
  "severity": "high",
  "affectedUrls": ["/"],
  "detectedAt": "2026-06-02",
  "rawMessage": "Homepage LCP > 4s on mobile according to PageSpeed Insights",
  "status": "new",
  "recommendedFix": "Optimise hero image. Use WebP, add explicit dimensions, preload.",
  "relatedFiles": ["src/pages/index.astro"],
  "validationSteps": ["Run PageSpeed Insights — LCP should be < 2.5s"],
  "notes": "Detected via manual PageSpeed check"
}
EOF

npm run seo:intake
```

---

## Security Notes

| What | Where stored | Committed? |
|------|-------------|------------|
| `GITHUB_TOKEN` | Google Apps Script Properties | ❌ Never |
| `GITHUB_OWNER` | Google Apps Script Properties | ❌ Never |
| `GITHUB_REPO` | Google Apps Script Properties | ❌ Never |
| Email content (rawText) | `data/seo-issues/inbox/*.json` | ✅ Yes (issue record) |
| Reports | `reports/seo-issue-queue.*` | ❌ No (gitignored) |

**The script never touches:**
- Exchange fee data
- Bonus values or conditions
- Affiliate URLs
- KYC or geo restriction data
- Any field tagged `manualReviewRequired: true`

---

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| `Missing Script Property: GITHUB_TOKEN` | Property not set | Re-check Step 5 |
| `GitHub API error 401` | Token invalid/expired | Generate a new token |
| `GitHub API error 403` | Token missing Contents:Write | Edit token permissions |
| `GitHub API error 422` | File already exists | Normal — script skips duplicates |
| No emails processed | Label filter not set up | Check Step 2 filters |
| Script timeout | Too many emails | Lower `MAX_PER_RUN` to 10 |
| "needs authorization" | First run | Follow Step 6 |

---

## Test Email Examples

To manually test classification, forward a real GSC email to yourself with label `SEO-Issues`.
Or send a test email with this body to your own address and apply the label:

**Fake GSC schema error:**
```
Subject: [Search Console] Product rich results - Invalid value in field 'priceCurrency'

We detected issues with structured data on your site cryptobonusworld.com.

Product: Invalid value in field 'priceCurrency'
The value 'USDT' is not a valid ISO 4217 currency code.

Affected pages:
https://cryptobonusworld.com/exchanges/bybit/
https://cryptobonusworld.com/exchanges/binance/

View full report in Search Console.
```

Expected result after processing:
```json
{
  "source": "manual",
  "issueType": "schema:invalid-currency",
  "severity": "high",
  "affectedUrls": ["/exchanges/bybit/", "/exchanges/binance/"],
  "status": "new",
  "manualReviewRequired": false,
  "autoFixPolicy": "requires-review"
}
```

---

*Script: `scripts/google-apps-script/seo-email-intake.gs`*  
*Schema: `data/seo-issues/_schema.ts`*  
*Processor: `scripts/seo-issue-intake.mjs`*
