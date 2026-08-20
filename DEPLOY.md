# Opix Instruments — Deployment Guide

A **static website** — plain HTML, CSS, JS and pre-built assets. There is **no
build step, no server runtime, no database**. Deploying = copying this folder to
any web server (or static host) and serving `index.html`.

- ~28 catalog sections, ~9,720 products (`data/products.js`)
- Product photos in `assets/img/products/`
- Downloadable PDF catalogs in `downloads/`
- "Shop by Specialty" (`specialties.html`) and "Catalog Downloads" (`downloads.html`)
- Total size ≈ 190 MB (mostly product images + catalog PDFs)

---

## 1. Configure before you go live

1. **WhatsApp number** — `assets/js/site.js`, set `OPIX.wa` to your WhatsApp
   Business number in international format, no `+` (e.g. `"923001234567"`).
   Until set, the "Send RFQ on WhatsApp" button opens an empty chat.
2. **Contact email** — same file, `OPIX.email` (defaults to `info@opixinst.com`).
3. **Domain** — if your domain is not `www.opixinst.com`, replace it in:
   - `sitemap.xml` and every page's `<link rel="canonical">` / `og:` tags
   - Quick find/replace: `www.opixinst.com` → your domain.
4. **robots.txt / sitemap.xml** — already present; update the domain as above.

> Tip: the canonical/domain strings are the only hard-coded absolute URLs.
> Everything else uses relative paths, so the site also works from a sub-folder.

---

## 2. Local preview

Any static file server works. With Python installed:

```bash
cd opix-site
python -m http.server 8000
# open http://localhost:8000/
```

Or Node: `npx serve .` — or just open `index.html` (note: `file://` disables
`fetch`-free features; a server is recommended).

---

## 3. Deploy to your own production server (Nginx) — recommended

This matches the "deploy on my production server" workflow.

### 3a. Get the files onto the server

**Option A — git pull (clean, repeatable):**
```bash
# On the server, first time:
sudo mkdir -p /var/www/opixinst
sudo chown "$USER" /var/www/opixinst
git clone git@github.com:metaxpert/opix-instruments-website.git /var/www/opixinst

# To update later:
cd /var/www/opixinst && git pull
```

**Option B — rsync from your machine:**
```bash
rsync -avz --delete ./ user@your-server:/var/www/opixinst/
```

### 3b. Nginx server block

```nginx
# /etc/nginx/sites-available/opixinst
server {
    listen 80;
    server_name opixinst.com www.opixinst.com;
    # allow certbot, then force HTTPS
    location /.well-known/acme-challenge/ { root /var/www/html; }
    location / { return 301 https://www.opixinst.com$request_uri; }
}

server {
    listen 443 ssl http2;
    server_name www.opixinst.com;
    root /var/www/opixinst;
    index index.html;

    ssl_certificate     /etc/letsencrypt/live/www.opixinst.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/www.opixinst.com/privkey.pem;

    # long cache for immutable assets, short for HTML
    location ~* \.(jpg|jpeg|png|webp|css|js|woff2)$ {
        expires 30d; add_header Cache-Control "public, immutable";
    }
    location ~* \.pdf$ { expires 7d; add_header Cache-Control "public"; }
    location = /sitemap.xml { add_header Cache-Control "no-cache"; }

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml text/html;
    gzip_min_length 1024;

    # nice URLs + 404
    try_files $uri $uri/ =404;
}
```

### 3c. Enable + HTTPS

```bash
sudo ln -s /etc/nginx/sites-available/opixinst /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
# issue the certificate (webroot method)
sudo certbot certonly --webroot -w /var/www/html \
    -d www.opixinst.com -d opixinst.com
sudo systemctl reload nginx
```

---

## 3C. Live deployment — Cloudflare Tunnel to a local nginx (current setup)

`opixinst.com` and `www.opixinst.com` are served **from a local machine** through
a named Cloudflare Tunnel. No public IP, no inbound firewall rule, no port
forwarding — cloudflared dials out to Cloudflare's edge and traffic arrives over
that connection. Everything runs unprivileged; nothing needs root.

```
opixinst.com ─┐
              ├─ CNAME → tunnel "opix-site" → cloudflared → nginx 127.0.0.1:8091 → this repo
www.opixinst ─┘
```

### 3C.1 Reproduce it
```bash
./deploy/install.sh
```
Installs cloudflared to `~/.local/bin`, builds the nginx prefix at
`~/.local/opix-nginx`, creates the tunnel, points DNS at it, and installs both
systemd **user** units with lingering enabled.

The one interactive step is `cloudflared tunnel login`. On a headless box it
prints a URL — open it on any device with a browser (laptop, phone), authorize
`opixinst.com`, and the server picks up `~/.cloudflared/cert.pem` by itself.

### 3C.2 What's in `deploy/`
| File | Purpose |
|---|---|
| `nginx.conf` | Static origin: gzip, cache policy, 404, blocks `/tools/` and `.py`/`.md` |
| `security-headers.conf` | Included by every location — see the gotcha below |
| `opix-nginx.service` | systemd user unit for the origin |
| `opix-tunnel.service` | systemd user unit for cloudflared |
| `install.sh` | Does all of the above end to end |

### 3C.3 Cache policy
Product photos, fonts → `1y, immutable`. PDFs → `30d`. CSS/JS → `7d`.
**HTML and `data/products.js` → `no-cache, must-revalidate`**, so catalog edits
go live on the next request instead of sitting in an edge cache.

### 3C.4 Two nginx gotchas that bit during setup
- `add_header` does **not** inherit into a `location` that declares its own.
  Security headers silently vanished on every cached file type until each
  location `include`d `security-headers.conf`. Keep that include when adding
  locations.
- `expires -1` already emits `Cache-Control: no-cache`; pairing it with an
  explicit `add_header Cache-Control` produced a duplicated header.

### 3C.5 Operating it
```bash
systemctl --user status  opix-tunnel opix-nginx
systemctl --user reload  opix-nginx        # after editing nginx.conf
journalctl --user -u opix-tunnel -f
```
nginx logs: `~/.local/opix-nginx/logs/`. Content updates are just `git pull` —
nginx serves the working tree directly, so there is nothing to rebuild or copy.

### 3C.6 Tradeoffs — read before relying on this
- **The site is only up while that machine is.** Sleep, reboot or an ISP outage
  takes `opixinst.com` down. The systemd units + lingering cover reboots
  (services start with nobody logged in); they cannot cover a powered-off box.
- **DNS rollback is not clean.** The apex/`www` CNAMEs replaced proxied A
  records that fronted Hostinger. Going back means re-pointing at Hostinger's
  origin IPs or redoing it from hPanel.
- **Mail is unaffected** — the Hostinger MX and SPF records were left alone.
- `--overwrite-dns` replaces a *single* record per hostname. If a name still has
  multiple A/AAAA records, delete them first or it fails with code 1003.

---

## 3H. Deploy to Hostinger shared hosting (hPanel)

The domain `opixinst.com` is registered at Hostinger and its DNS
(`ns1/ns2.dns-parking.com`), mail (`mx1/mx2.hostinger.com`) and CDN (`hcdn`)
all run there — so hosting the site on the same account is the least-moving-parts
option. Requires a **Web Hosting plan** (Premium / Business / Cloud). A
Website-Builder-only plan cannot serve these files; add hosting or a VPS first.

### 3H.1 Check what you have
hPanel → **Hosting** in the top nav.
- A hosting plan listed → continue below.
- Only **Websites → Website Builder** → you need to buy a Web Hosting plan and
  point the domain at it before any of this applies.

### 3H.2 Free the domain from the Website Builder
`opixinst.com` currently serves a Hostinger Website Builder (Zyro) site. In
hPanel → Websites → the builder site → **Domain → disconnect / point elsewhere**,
then attach `opixinst.com` to the hosting plan as the primary domain.
Web root becomes `~/domains/opixinst.com/public_html` (or `~/public_html` when
it is the plan's primary domain).

### 3H.3a Upload — via SSH + git (best; 187 MB never leaves the server's network)
Get credentials from hPanel → **Advanced → SSH Access** (note the host and the
non-standard port, usually **65002**).

```bash
ssh -p 65002 uXXXXXXXX@<ssh-host>
cd ~/domains/opixinst.com/public_html
rm -rf ./*                       # clear the builder's leftovers
git clone https://github.com/metaxpert/opix-instruments-website.git .
rm -rf .git .github tools        # optional: drop repo/tooling from the web root
```

Updating later is then just `git pull` over SSH.

### 3H.3b Upload — via File Manager (no SSH)
hPanel → **Files → File Manager**, open `public_html`, delete existing contents,
then **Upload** and extract. The site is 187 MB / 9,724 files, so upload a zip —
uploading loose files times out. Hostinger's per-file upload cap is 100 MB, so
split it:

```bash
zip -rq opix-core.zip      . -x ".git/*" ".github/*" "tools/*" "downloads/*"   #  71 MB
zip -rq opix-downloads.zip downloads                                          #  78 MB
```

Upload each, right-click → **Extract** into `public_html`, then delete the zips.
Do **not** use plain FTP for 9,724 small files — it takes hours.

### 3H.4 Server config
Hostinger runs LiteSpeed, which reads `.htaccess`. This repo does not ship one —
the live deployment is the Cloudflare Tunnel in §3C, whose nginx origin ignores
`.htaccess` entirely. If you move back to Hostinger, port the gzip/cache/404
rules from `deploy/nginx.conf` into an `.htaccess` at the web root.

### 3H.5 SSL and the www/non-www decision
- hPanel → **Security → SSL** → install the free Let's Encrypt certificate for
  both `opixinst.com` and `www.opixinst.com`.
- Hostinger currently **301-redirects `www` → apex**, but every page's
  `<link rel="canonical">` and `sitemap.xml` point at `https://www.opixinst.com/`
  — a canonical that redirects. Pick one and make them agree: either set the
  preferred domain to `www` in hPanel, or rewrite the 33 HTML files plus the
  sitemap to the apex domain.

### 3H.6 Auto-deploy (optional)
The workflow in §6 works against Hostinger shared hosting — set the GitHub
secrets to `SSH_HOST` = your Hostinger SSH host, `SSH_PORT` = `65002`,
`SSH_USER` = `uXXXXXXXX`, `DEPLOY_PATH` = `/home/uXXXXXXXX/domains/opixinst.com/public_html`,
and add the public deploy key in hPanel → Advanced → SSH Access → **Manage SSH keys**.

---

## 4. Deploy to Apache (alternative)

Point a `VirtualHost` `DocumentRoot` at this folder. Recommended `.htaccess`:

```apache
# opix-site/.htaccess
Options -Indexes
AddType application/pdf .pdf
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json image/svg+xml
</IfModule>
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpeg "access plus 30 days"
  ExpiresByType text/css   "access plus 30 days"
  ExpiresByType application/javascript "access plus 30 days"
  ExpiresByType application/pdf "access plus 7 days"
  ExpiresByType text/html  "access plus 0 seconds"
</IfModule>
```

---

## 5. Deploy to a static host (fastest, zero server admin)

Because it's pure static files, it drops straight onto:

| Host | How |
|------|-----|
| **Netlify** | New site → connect the GitHub repo. Build command: *(none)*. Publish directory: `.` (repo root). |
| **Vercel** | Import repo → Framework preset **Other** → Output dir `.` |
| **Cloudflare Pages** | Connect repo → Build command *(none)* → Build output `/` |
| **GitHub Pages** | Repo → Settings → Pages → Deploy from branch `main`, folder `/ (root)`. (Note: GitHub Pages has a soft 1 GB repo / 100 GB-bandwidth limit; the ~90 MB of PDFs is fine but heavy download traffic counts against bandwidth — a real host/CDN is better for the PDFs.) |

Add your custom domain in the host's dashboard and it handles HTTPS for you.

---

## 6. Optional — auto-deploy on every push (GitHub Actions → your server)

Create `.github/workflows/deploy.yml` and add repo secrets
`SSH_HOST`, `SSH_USER`, `SSH_KEY` (a private deploy key).

```yaml
name: Deploy
on:
  push: { branches: [ main ] }
jobs:
  rsync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: rsync to server
        run: |
          echo "${{ secrets.SSH_KEY }}" > key && chmod 600 key
          rsync -avz --delete -e "ssh -i key -o StrictHostKeyChecking=no" \
            --exclude '.git' ./ \
            ${{ secrets.SSH_USER }}@${{ secrets.SSH_HOST }}:/var/www/opixinst/
```

Now `git push` → the server updates automatically.

---

## 7. Updating content

All content is generated from a few sources by scripts in `tools/`
(needs **Python 3** with `pymupdf`, `pillow`, `numpy`, `opencv-python`, and
**Node** for the `.js` generators). See `README.md` for the per-catalog pipeline.

Common tasks:

| Change | Command(s) |
|--------|-----------|
| Add / edit a catalog section | build its block into `data/products.js`, then `python tools/make_page.py …` |
| Rebuild the home grid + sitemap | `node tools/regen.js` |
| Rebuild the specialty page | `node tools/gen_specialties.js` |
| Rebuild catalog download PDFs | `python tools/batch_compress.py` |
| Rebuild the downloads page | `node tools/gen_downloads.js` |
| Change section logos / photos | edit `tools/card_assets.js`, then re-run the two generators |

`tools/manifest.json` is the source of truth for section code → title / blurb / PDF.
After any change, bump the `?v=` query on `assets/css/site.css` links (or hard-refresh)
to bust browser cache.

---

## 8. Checklist

- [ ] `OPIX.wa` and `OPIX.email` set in `assets/js/site.js`
- [ ] Domain replaced in `sitemap.xml` + canonicals (if not opixinst.com)
- [ ] HTTPS certificate issued and redirect from HTTP working
- [ ] gzip + cache headers enabled
- [ ] `robots.txt` / `sitemap.xml` reachable and correct
- [ ] Spot-check: home, a catalog page, specialties, downloads (download a PDF),
      the inquiry cart (add item → Send RFQ by Email / WhatsApp)
