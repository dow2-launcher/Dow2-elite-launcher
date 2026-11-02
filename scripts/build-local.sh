#!/bin/bash
# scripts/build-local.sh [out dir]: a release build of the launcher on your own computer that talks to the real servers
# (mirrors, chat, Online, rooms, logs) - without the CI secrets and without addresses in the repository.
#
# The mirrors come from the signed launcher.json an installed launcher keeps (%APPDATA%\EliteLauncher\launcher.json,
# ~/.config/EliteLauncher on Linux); the API hosts are their hosts (not the storage-only ones: *.r2.dev). Set
# ELITE_MIRRORS / ELITE_LOG_HOSTS yourself to override. The exe (no installer, no self-update signature) goes to
# <out dir> (default dist-local/) named after the branch and commit. Needs Rust; the frontend is app/ui as is.
set -eu
cd "$(dirname "$0")/.."
OUT=${1:-dist-local}
CFG="${APPDATA:-$HOME/.config}/EliteLauncher/launcher.json"
if [ -z "${ELITE_MIRRORS:-}" ]; then
  [ -f "$CFG" ] || { echo "no $CFG - start an installed launcher once, or set ELITE_MIRRORS" >&2; exit 1; }
  ELITE_MIRRORS=$(tr -d '\r\n' < "$CFG" | grep -o '"mirrors": *\[[^]]*\]' | grep -o 'https://[^"]*' | paste -sd ';' -)
fi
[ -n "$ELITE_MIRRORS" ] || { echo "no mirrors found in $CFG" >&2; exit 1; }
if [ -z "${ELITE_LOG_HOSTS:-}" ]; then
  ELITE_LOG_HOSTS=$(echo "$ELITE_MIRRORS" | tr ';' '\n' | sed -E 's#^(https://[^/]+).*#\1#' | grep -v '\.r2\.dev$' | awk '!seen[$0]++' | paste -sd ';' -)
fi
export ELITE_MIRRORS ELITE_LOG_HOSTS
echo "mirrors:   $ELITE_MIRRORS" | sed -E 's#/eu/[^/;]+#/eu/…#g'
echo "API hosts: $ELITE_LOG_HOSTS"
cargo build --release -p elite-launcher
TGT=${CARGO_TARGET_DIR:-target}
EXE=$TGT/release/elite-launcher; [ -f "$EXE.exe" ] && EXE=$EXE.exe
mkdir -p "$OUT"
NAME="EliteLauncher-$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' app/tauri.conf.json | head -1)-$(git rev-parse --abbrev-ref HEAD | tr '/' '-')-$(git rev-parse --short HEAD)"
cp "$EXE" "$OUT/$NAME${EXE##*elite-launcher}"
echo "built: $OUT/$NAME${EXE##*elite-launcher}"
