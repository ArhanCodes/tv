# tv streaming tracker

a tiny, self-hostable "currently watching" API for Prime Video, Netflix, and Disney+. Anyone can deploy it for free and show what they're streaming on their personal website

## How it works

```
 Browser (Chrome extension)         Cloudflare Worker              Your website
 ─────────────────────────          ─────────────────              ────────────
 Detects video playing       ─►     POST /update                    GET /
 Scrapes show title                 (auth: Bearer token)            (public, no auth)
                                    stored in KV, 30-min TTL        displays title
```

Two parts, plus a small snippet for your site:

- `worker/` — Cloudflare Worker (free serverless API)
- `extension/` — Chrome/Edge/Brave extension (Manifest V3)
- `client-example.html` — sample HTML/JS showing how to display on your own site

## Setup (for anyone)

### 1. Deploy the Cloudflare Worker

You'll need a [free Cloudflare account](https://dash.cloudflare.com/sign-up)

```bash
cd worker

# Install the Cloudflare CLI (once, globally)
npm install -g wrangler

# Log in (opens browser)
wrangler login

# Create a KV namespace for state
wrangler kv namespace create WATCHING
```

Copy the `id` printed by that command, then edit `wrangler.toml` and uncomment the block with your id:

```toml
[[kv_namespaces]]
binding = "WATCHING"
id = "paste-id-here"
```

Set an auth token:

```bash
wrangler secret put AUTH_TOKEN
# paste something like: openssl rand -hex 32
```

Deploy:

```bash
wrangler deploy
```

You'll get a URL like `https://streaming-tracker.<yourname>.workers.dev`

### 2. Install the extension

1. Open `chrome://extensions` (or `edge://extensions`, `brave://extensions`)
2. Toggle Developer mode on
3. Click Load unpacked and pick the `extension/` folder
4. Click the extension's puzzle icon then Options
5. Paste your worker URL and your AUTH_TOKEN

### 3. Display it on your site

Fetch `GET https://<your-worker-url>/` — it returns either `null` or:

```json
{
  "title": "The Bear — Episode 3",
  "service": "Disney+",
  "url": "https://www.disneyplus.com/video/...",
  "updatedAt": 1777000000000
}
```

Minimal example:

```html
<div id="watching"></div>
<script>
const API = 'https://streaming-tracker.<you>.workers.dev';
async function update() {
  const res = await fetch(API);
  const data = await res.json();
  const el = document.getElementById('watching');
  el.textContent = data ? `watching ${data.title} on ${data.service}` : '';
}
update();
setInterval(update, 30000);
</script>
```

See `client-example.html` for a styled version.

## Supported services

- [Prime Video](primevideo.com)
- [Netflix](netflix.com/watch)
- [Disney+](disneyplus.com)

To add more just add the host permission in `manifest.json` and a `getTitleX()` scraper in `content.js`
