#!/usr/bin/env bash
# Reproduce the Cloudflare Tunnel deployment on a headless machine.
#
# Serves this repo from a user-space nginx on 127.0.0.1:8091 and exposes it at
# opixinst.com / www.opixinst.com through a named Cloudflare Tunnel. Needs no
# root: nginx runs unprivileged under its own prefix, and both processes are
# systemd *user* units kept alive across reboots by loginctl lingering.
set -euo pipefail

SITE=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
PREFIX="$HOME/.local/opix-nginx"
UNITS="$HOME/.config/systemd/user"
TUNNEL=opix-site
PORT=8091

command -v nginx >/dev/null || { echo "nginx not installed"; exit 1; }

# 1. cloudflared (user-local; no package manager, no sudo)
if [ ! -x "$HOME/.local/bin/cloudflared" ]; then
  mkdir -p "$HOME/.local/bin"
  curl -fsSL -o "$HOME/.local/bin/cloudflared" \
    https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
  chmod +x "$HOME/.local/bin/cloudflared"
fi
CF="$HOME/.local/bin/cloudflared"

# 2. nginx prefix — logs, pid and temp paths must be user-writable
mkdir -p "$PREFIX"/{logs,tmp/client,tmp/proxy,tmp/fastcgi,tmp/uwsgi,tmp/scgi}
sed "s|/home/metaxperts/opix/opix-instruments-website|$SITE|g" \
  "$SITE/deploy/nginx.conf" > "$PREFIX/nginx.conf"
cp "$SITE/deploy/security-headers.conf" "$PREFIX/security-headers.conf"
nginx -p "$PREFIX" -c "$PREFIX/nginx.conf" -t

# 3. Cloudflare auth — prints a URL to open on ANY device with a browser
[ -f "$HOME/.cloudflared/cert.pem" ] || $CF tunnel login

# 4. Named tunnel + ingress
$CF tunnel list | grep -q " $TUNNEL " || $CF tunnel create "$TUNNEL"
UUID=$($CF tunnel list --output json | python3 -c \
  "import json,sys;print([t['id'] for t in json.load(sys.stdin) if t['name']=='$TUNNEL'][0])")
cat > "$HOME/.cloudflared/config.yml" <<YML
tunnel: $UUID
credentials-file: $HOME/.cloudflared/$UUID.json

originRequest:
  connectTimeout: 30s
  noHappyEyeballs: true

ingress:
  - hostname: opixinst.com
    service: http://127.0.0.1:$PORT
  - hostname: www.opixinst.com
    service: http://127.0.0.1:$PORT
  - service: http_status:404
YML
$CF tunnel ingress validate

# 5. DNS. --overwrite-dns replaces ONE record per name; if the hostname still
#    has several A/AAAA records, delete them in the dashboard first or this
#    fails with "record with that host already exists" (code 1003).
$CF tunnel route dns --overwrite-dns "$TUNNEL" opixinst.com
$CF tunnel route dns --overwrite-dns "$TUNNEL" www.opixinst.com

# 6. systemd user units + lingering so they survive reboot with nobody logged in
mkdir -p "$UNITS"
sed "s|/home/metaxperts|$HOME|g" "$SITE/deploy/opix-nginx.service"  > "$UNITS/opix-nginx.service"
sed "s|/home/metaxperts|$HOME|g" "$SITE/deploy/opix-tunnel.service" > "$UNITS/opix-tunnel.service"
systemctl --user daemon-reload
systemctl --user enable --now opix-nginx.service opix-tunnel.service
loginctl enable-linger "$USER"

echo
systemctl --user is-active opix-nginx.service opix-tunnel.service
echo "Done. Logs: journalctl --user -u opix-tunnel -f"
