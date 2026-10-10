# samwitte-forms

Cloudflare Worker behind the "Request a quote" form. It checks each submission
(origin, size, rate limits, honeypot, fields, Turnstile) and emails it to
sam@samwitte.com through Proton's SMTP server using
[worker-mailer](https://github.com/zou-yu/worker-mailer). Nothing is stored, and
no email service sits in between: the data only touches Cloudflare and Proton.

```
samwitte.com ──POST──▶ api.samwitte.com/quote (this Worker) ──SMTP 587/STARTTLS──▶ Proton ──▶ inbox
```

## One-time setup

### 1. Proton: an SMTP token

SMTP tokens need a paid plan and a custom-domain address, which you already have.

1. *Optional:* make a dedicated sending address so the form's mail is easy to
   filter and its token can be revoked on its own. In Proton Mail, open
   **Settings → All settings** and find the addresses section (*Identity and
   addresses*), then add `forms@samwitte.com`. Using `sam@samwitte.com` also works.
2. Go to **Settings → All settings → IMAP/SMTP → SMTP tokens → Generate token**.
3. Name it `samwitte.com quote form` and pick the address from step 1.
4. Copy the **username** (the address) and the **token**. Proton only shows
   the token once.

### 2. Cloudflare: a Turnstile widget

1. In the Cloudflare dashboard, open **Turnstile → Add widget**.
2. **Widget name:** `samwitte.com quote form`. **Hostname management:**
   `samwitte.com` and `www.samwitte.com`. **Widget mode:** Managed. Leave
   pre-clearance off, then **Create**.
3. Copy the **site key** and the **secret key**.
4. Put the **site key** in [`../src/quote.js`](../src/quote.js), replacing
   `REPLACE_WITH_TURNSTILE_SITE_KEY`. It's public by design.

### 3. Deploy the Worker

Every `wrangler` command below must run **inside `worker/`**. Run from the repo
root, Wrangler doesn't find this folder's `wrangler.toml` and offers to set the
whole site up as a new static-site project instead. If you see "Detected Project
Settings", answer no and `cd worker` first.

```sh
cd worker                   # from the repo root
npm install
npx wrangler login          # opens a browser to authorize Wrangler on your account
npx wrangler deploy         # creates the Worker and the api.samwitte.com DNS record
```

The deploy output should name the Worker `samwitte-forms` and list
`api.samwitte.com` under triggers.

Then add the three secrets. Each command prompts for the value, so nothing ends
up in your shell history:

```sh
npx wrangler secret put SMTP_USER          # the Proton address, e.g. forms@samwitte.com
npx wrangler secret put SMTP_TOKEN         # the Proton SMTP token
npx wrangler secret put TURNSTILE_SECRET   # the Turnstile secret key
```

### 4. Check it

- **Workers & Pages → samwitte-forms → Settings → Domains & Routes** should list
  `api.samwitte.com`.
- Run `npx wrangler tail` in one terminal, submit the form on the live site, and
  watch the request come through. The email lands in your inbox, and a copy
  shows up in the sending address's Sent folder. That's how Proton SMTP works.
- If it says `mail_failed`, the log line after `mail failed:` will say why.
  It's usually the token or address.

## Local development

```sh
cp .dev.vars.example .dev.vars   # Turnstile test keys + dry run: nothing is emailed
npm run dev                      # Worker on http://localhost:8787
```

Run the site with `yarn start` (port 1234) from the repo root. On localhost,
`quote.js` automatically uses the local Worker and Turnstile's always-pass test
key. In dry-run mode the email is printed to the `wrangler dev` console instead
of being sent.

## Tuning

| What | Where |
| --- | --- |
| Submissions per visitor per minute (2) | `PER_IP_LIMITER` in `wrangler.toml` |
| Submissions per minute overall (10) | `GLOBAL_LIMITER` in `wrangler.toml` |
| Who can post | `ALLOWED_ORIGINS` in `wrangler.toml` |
| Where mail goes | `MAIL_TO` in `wrangler.toml` |
| Field limits and stage options | top of `src/index.js` (keep the `<select>` in `../src/index.html` in sync) |

Rate-limit windows can only be 10 or 60 seconds. The limits are per Cloudflare
location and slightly loose by design. Turnstile is the main defence; the rate
limits are a backstop.
