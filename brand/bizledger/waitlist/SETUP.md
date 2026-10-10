# BizLedger waitlist: setup (about 10 minutes)

## 1. Create the table (Supabase)
1. Open your Supabase project -> **SQL Editor** -> **New query**.
2. Paste the contents of `setup.sql` and click **Run**.
3. Sign-ups will appear in **Table Editor -> waitlist**.

## 2. Connect the page
Open `index.html` and fill in the `CONFIG` block near the bottom:

| Field | Where to find it |
|---|---|
| `supabaseUrl` | Project Settings -> API -> **Project URL** |
| `supabaseAnonKey` | Project Settings -> API -> **anon / publishable** key |
| `whatsappNumber` | Your number, digits only, e.g. `2348030000000` |

**Never paste the `service_role` key.** The anon key is safe in a public page
because row-level security only allows inserts.

Leave `supabaseUrl` blank to use WhatsApp-only mode (the form opens a pre-filled
WhatsApp chat to you). That works with no database.

## 3. Publish it (free) and get your link
Easiest: **Netlify Drop**
1. Go to https://app.netlify.com/drop (free account).
2. Drag the whole `waitlist` folder onto the page.
3. You get a link like `https://random-name.netlify.app`. Rename it in Site settings,
   e.g. `bizledger.netlify.app`.

Alternatives: Vercel, Cloudflare Pages, or GitHub Pages (drag/upload the folder).

## 4. Put the link in your Instagram bio
Profile -> Edit profile -> Links -> Add external link -> paste your URL.

## 5. Test before you announce
Submit one entry yourself. Check it in the Supabase table (or that WhatsApp opens).
Then delete your test row.
