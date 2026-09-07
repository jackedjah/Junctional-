#!/usr/bin/env bash
# MAHWORLD — local dev server.
#
# WHY THIS EXISTS, AND WHY IT IS THIS SHORT. The MAHFITT site is a static Netlify site with no
# build step, and MAHWORLD is plain ES modules plus a vendored Three.js r185. Nothing here needs
# compiling, bundling or installing. It only needs to be served over HTTP, because a browser will
# not load ES modules from a file:// URL. That is the entire requirement, so this is the entire
# tool.
#
# It binds to 0.0.0.0 so a phone on the same Wi-Fi can reach it, and it prints the exact URL to
# open. It serves the repository ROOT rather than any subfolder, because the scene modules import
# ../vendor/three/ by relative path and would 404 under a narrower root.
#
# It does NOT deploy anything, does NOT modify any production file, and does NOT expose anything
# beyond the local network.
#
# Usage:   ./mahworld-shader-lab/serve.sh [port]      (default 8787)

set -euo pipefail
PORT="${1:-8787}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# the LAN address a phone should use — first non-loopback IPv4, however this machine reports it
IP=""
if command -v hostname >/dev/null 2>&1; then IP="$(hostname -I 2>/dev/null | awk '{print $1}')" || true; fi
if [ -z "${IP:-}" ] && command -v ipconfig >/dev/null 2>&1; then
  IP="$(ipconfig getifaddr en0 2>/dev/null || true)"                       # macOS Wi-Fi
  [ -z "${IP:-}" ] && IP="$(ipconfig getifaddr en1 2>/dev/null || true)"   # macOS Ethernet
fi
[ -z "${IP:-}" ] && IP="localhost"

echo
echo "  MAHWORLD dev server"
echo "  serving: $ROOT"
echo
echo "  On this computer:"
echo "    http://localhost:$PORT/mahworld/scene/mahplaza.html"
echo
echo "  On your phone (same Wi-Fi network):"
echo "    http://$IP:$PORT/mahworld/scene/mahplaza.html     <-  MAHWORLD, interactive"
echo "    http://$IP:$PORT/mahworld/scene/skyrealm.html     <-  the sky realm"
echo "    http://$IP:$PORT/mahworld-shader-lab/             <-  the shader lab"
echo
echo "  Ctrl-C to stop."
echo

cd "$ROOT"
exec python3 -m http.server "$PORT" --bind 0.0.0.0
