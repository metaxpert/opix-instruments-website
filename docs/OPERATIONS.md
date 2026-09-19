# Opix Instruments — Operations Runbook

How `opixinst.com` is served, how to change it, and how to fix it when it
breaks. For first-time setup see [`DEPLOY.md`](../DEPLOY.md) §3C; for the
alternative hosting paths (Hostinger, VPS, static hosts) see the other sections
there.

---

## 1. Architecture

```
                    ┌──────────────────────────────────────────┐
  visitor ────────► │  Cloudflare edge  (TLS, cache, WAF)      │
                    └───────────────────┬──────────────────────┘
                                        │  outbound tunnel, no inbound port
                    ┌───────────────────▼──────────────────────┐
                    │  cloudflared  "opix-site"                │
                    │  systemd user unit: opix-tunnel.service  │
                    └───────────────────┬──────────────────────┘
                                        │  http://127.0.0.1:8091
                    ┌───────────────────▼──────────────────────┐
                    │  nginx (user-space, ~/.local/opix-nginx) │
                    │  systemd user unit: opix-nginx.service   │
                    └───────────────────┬──────────────────────┘
                                        │  reads the working tree directly
                    ┌───────────────────▼──────────────────────┐
                    │  this repo — static HTML/CSS/JS + assets │
                    └──────────────────────────────────────────┘
```

**Why a tunnel.** The origin has no public IP and no inbound firewall rule open.
cloudflared dials *out* to Cloudflare and traffic returns over that connection,
so the machine is never directly reachable from the internet.

**Why a second nginx.** The system nginx on this host already serves eight
unrelated vhosts on `:80`. Editing `/etc/nginx` needs root and risks those, so
this deployment runs its own unprivileged nginx under a private prefix. The two
never interact.

### Facts

| | |
|---|---|
| Tunnel name / ID | `opix-site` / `fe362f1f-c100-4b65-ba5c-de66fa2af473` |
| Origin | `127.0.0.1:8091` (loopback only — not reachable from the LAN) |
| nginx prefix | `~/.local/opix-nginx/` (conf, `logs/`, `tmp/`) |
| Tunnel config | `~/.cloudflared/config.yml` |
| Credentials | `~/.cloudflared/cert.pem`, `~/.cloudflared/<UUID>.json` |
| Web root | this repository's working tree |
| DNS | `opixinst.com` + `www` → CNAME → tunnel (proxied) |
| Mail | Hostinger MX — **not** part of this setup, do not touch |

---

## 2. Daily operations

```bash
# status
systemctl --user status opix-tunnel opix-nginx

# publish content changes — nginx serves the working tree, nothing to build
git pull

# after editing nginx config
cp deploy/nginx.conf deploy/security-headers.conf ~/.local/opix-nginx/
nginx -p ~/.local/opix-nginx -c ~/.local/opix-nginx/nginx.conf -t   # ALWAYS test first
systemctl --user reload opix-nginx

# after editing ~/.cloudflared/config.yml
cloudflared tunnel ingress validate
systemctl --user restart opix-tunnel

# logs
journalctl --user -u opix-tunnel -f
tail -f ~/.local/opix-nginx/logs/access.log
tail -f ~/.local/opix-nginx/logs/error.log
```

Content updates need **no** deploy step. nginx reads the working tree, so a
`git pull` is live immediately. HTML and `data/products.js` are served
`no-cache, must-revalidate`, so edges revalidate on the next request rather than
serving a stale catalog.

---

## 3. Boot behaviour

Both units are `enable`d and **user lingering is on** (`loginctl enable-linger`),
so they start at boot with nobody logged in — required here because the box is
administered over SSH only.

`opix-tunnel.service` declares `Requires=opix-nginx.service`, so the origin
always starts first and the two stop together; the tunnel never advertises a
healthy endpoint in front of a dead backend. `opix-nginx.service` runs
`nginx -t` as `ExecStartPre`, so a bad config fails the unit loudly instead of
leaving the site down silently.

`Restart=always` with `StartLimitIntervalSec=0` means cloudflared keeps retrying
through a long outage rather than systemd giving up and staying dead. Verified
by `kill -9` on the connector: it came back in under 15 seconds with no visible
downtime.

> **Lingering does not survive a reinstall.** If the user account is recreated,
> re-run `loginctl enable-linger $USER`.

---

## 4. Caching

| Content | Policy | Why |
|---|---|---|
| Product photos, fonts | `max-age=31536000, immutable` | Filename-versioned by SKU; never edited in place |
| Catalog PDFs | `max-age=2592000` | Reissued rarely |
| CSS, JS | `max-age=604800` | Versioned via `?v=` query string |
| **HTML** | `no-cache, must-revalidate` | Catalog edits must appear immediately |
| **`data/products.js`** | `no-cache, must-revalidate` | Same — this file *is* the catalog |

To purge Cloudflare's copy after a change: dashboard → Caching → Purge Everything.
Rarely needed given the no-cache policy on the two files that actually change.

---

## 5. Security posture

**What is enforced at the origin** (`deploy/security-headers.conf`, included by
every location block):

`Content-Security-Policy`, `Strict-Transport-Security` (1 year,
includeSubDomains, no preload), `X-Content-Type-Options`, `X-Frame-Options`,
`Referrer-Policy`, `Cross-Origin-Opener-Policy`, `Permissions-Policy`.

Additionally: non-`GET`/`HEAD` methods return 405, request bodies are capped at
1 KB, `/tools/` and `.py`/`.md`/dotfiles return 404, `server_tokens` is off, and
per-IP rate limiting is keyed on the real visitor IP.

**Honest limitation — the CSP allows `'unsafe-inline'` for scripts.** The pages
contain 29 inline `<script>` blocks and 56 inline `onerror="this.remove()"`
handlers, so a strict policy would break the site. The CSP therefore does *not*
prevent inline-script XSS. It still prevents loading script or style from an
arbitrary third-party origin, `<base>` hijacking, plugin content, and off-site
framing. **To close this properly**, move the inline scripts into `assets/js/`
and the `onerror` handlers into a delegated listener, then delete
`'unsafe-inline'` from `script-src`.

**Credentials.** `~/.cloudflared/` is `0700`; `cert.pem` and `config.yml` are
`0600`; the tunnel credentials JSON is `0400`. None of it is in the repo, and
none of it should ever be — anyone holding the credentials JSON can run a
connector for this tunnel. To revoke, delete the tunnel and recreate it.

**Rate limiting.** 50 r/s per IP, burst 200 nodelay, max 50 concurrent
connections per IP; over-limit requests get 429. The burst is what matters — a
catalog page fires ~60 image requests at once. Verified with an 80-request
concurrent burst: all 200, no false positives. The limit is keyed on
`CF-Connecting-IP` via `set_real_ip_from 127.0.0.1`; **without that rewrite every
request would share one `127.0.0.1` bucket and the limit would be worthless.**

**Recommended, not yet configured** (Cloudflare dashboard, needs an account
login): Always Use HTTPS, Minimum TLS 1.2, Bot Fight Mode, and a WAF managed
ruleset.

---

## 6. Troubleshooting

### The site shows the *old* Hostinger page
Almost always stale DNS, not a broken deploy. Confirm what is actually served,
bypassing every cache:

```bash
curl -sI --resolve opixinst.com:443:172.67.172.89 https://opixinst.com/ | grep -i server
```
`server: cloudflare` = working. `server: hcdn` = you reached Hostinger.

Then clear the caches: `sudo resolvectl flush-caches` on the box, a hard reload
plus `chrome://net-internals/#dns` in the browser, or just test on mobile data.

### The domain resolves to nothing
A cached negative answer. This zone's SOA negative TTL is **1800s (30 minutes)**,
so a window where the record was missing is remembered for up to half an hour by
resolvers that queried during it. Check the authoritative servers directly —
if they answer, it will resolve everywhere once the negative TTL expires:

```bash
dig +short opixinst.com @bruce.ns.cloudflare.com
```

### 502 from Cloudflare
The tunnel is up but nginx is not. `systemctl --user status opix-nginx`, then
`curl -I http://127.0.0.1:8091/`.

### 1033 / tunnel error from Cloudflare
cloudflared is not connected. `journalctl --user -u opix-tunnel -n 50`, then
`cloudflared tunnel info opix-site` to see live connector registrations.

### Legitimate traffic getting 429
Raise the burst in `deploy/nginx.conf` (`limit_req ... burst=200`), or comment
out the `limit_req` line, then reload.

### Nothing works after a reboot
```bash
loginctl show-user "$USER" --property=Linger    # expect Linger=yes
systemctl --user is-enabled opix-nginx opix-tunnel
```

---

## 6a. Country blocking (Pakistan)

The origin can refuse a whole country. It is wired up but **off** — the switch
is one line. Everything keys on `CF-IPCountry`, which Cloudflare stamps on
every request it forwards; a request that never went through Cloudflare has no
such header, so `127.0.0.1:8091` keeps working no matter what is blocked.

### Check the current state

```bash
grep -A3 'map $http_cf_ipcountry' ~/.local/opix-nginx/nginx.conf
```

`"PK"    1;` means blocking is armed, `"PK"    0;` means it is off. To see what
the *running* server does, without waiting for a real visitor:

```bash
curl -s -o /dev/null -w '%{http_code}\n' -H 'CF-IPCountry: PK' http://127.0.0.1:8091/   # 403 = blocking
curl -s -o /dev/null -w '%{http_code}\n' -H 'CF-IPCountry: US' http://127.0.0.1:8091/   # 200 always
```

### Turn it ON

The office is in Pakistan. Put its public IPv4 in the allowlist first, or the
office loses the public site along with everyone else:

```bash
curl -s https://ifconfig.me          # the office's public IP, run from the office
```

In `deploy/nginx.conf`, uncomment and set the line in `geo $geo_allowlisted`:

```nginx
geo $geo_allowlisted {
  default 0;
  203.0.113.45/32  1;        # <- the address from above
}
```

Then apply:

```bash
cp deploy/nginx.conf deploy/security-headers.conf ~/.local/opix-nginx/
nginx -p ~/.local/opix-nginx -c ~/.local/opix-nginx/nginx.conf -t   # ALWAYS test first
systemctl --user reload opix-nginx
```

### Turn it OFF — the revert

Change the one line in `deploy/nginx.conf` from `1` to `0`:

```nginx
map $http_cf_ipcountry $geo_country_blocked {
  default 0;
  "PK"    0;                 # was 1
}
```

then the same three commands as above. Nothing else needs touching, and the
allowlist can stay where it is. Confirm with the `CF-IPCountry: PK` curl — it
should answer 200 again.

### Locked out with no shell

Reverting needs a shell on this machine, and the block never applies to
`127.0.0.1`, so a local terminal always works. If the block is instead in
Cloudflare's WAF, disable the custom rule in the dashboard — that needs no
access to this machine at all, which is one reason to prefer it.

### Doing it at Cloudflare instead

Better: the request is dropped at the edge rather than carried down the tunnel
to a machine in Sialkot. *Security → WAF → Custom rules*, expression

```
(ip.src.country eq "PK" and not cf.client.bot)
```

action Block. `not cf.client.bot` keeps verified crawlers out of the rule.
Reverting is the toggle next to the rule. Keep the nginx rule as the backstop
for anything that reaches the origin another way.

Blocking a country is **not** a robots directive. Googlebot, Bingbot and
YandexBot crawl from outside PK, so nothing changes in search.

## 7. Changing DNS / rolling back

`cloudflared tunnel route dns --overwrite-dns` replaces **one** record per
hostname. If a name still carries several `A`/`AAAA` records it fails with:

```
code: 1003 ... An A, AAAA, or CNAME record with that host already exists
```

Delete the extras in the Cloudflare dashboard first, then re-run.

**Rolling back to Hostinger is not a clean undo.** The apex and `www` CNAMEs
replaced proxied `A` records that fronted Hostinger, and Cloudflare's proxy hid
the real origin. To revert, delete the tunnel CNAMEs and either re-create `A`
records pointing at Hostinger (`145.79.24.164`, `145.79.29.131` as observed in
August 2026 — **re-verify before relying on them**) or reconnect the domain from
hPanel.

The Hostinger `MX` and SPF records were deliberately left untouched, so email
keeps working regardless of where the website is served from. **Do not delete
them** while migrating hosting.

---

## 8. Known limitations

1. **The site is up only while this machine is.** Sleep, shutdown, or an ISP
   outage takes `opixinst.com` down. The systemd units cover reboots; they
   cannot cover a powered-off box. For a business-critical site, either keep
   this host on a UPS with reliable uplink, or move to Hostinger/VPS hosting
   (`DEPLOY.md` §3H) and keep this setup for staging.
2. **Single point of failure.** One connector on one machine. Cloudflare
   supports multiple connectors on the same tunnel for redundancy — run
   `cloudflared tunnel run opix-site` on a second host with the same
   credentials and Cloudflare load-balances between them.
3. **`www` and the apex both serve identical content with no redirect**, so
   every page is reachable at two URLs while the canonicals point at `www`.
   Fix with one Cloudflare redirect rule rather than editing 33 HTML files.
4. **No monitoring.** Nothing alerts if the site goes down. Cloudflare
   Notifications (Tunnel health) or any external uptime check would cover it.
5. **`.github/workflows/deploy.yml` is disabled**, not deleted. Its `SSH_HOST`
   secret still points at the old rsync target; re-point it before re-enabling.
