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
