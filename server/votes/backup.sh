#!/bin/sh
# cbw-votes daily backup — copies the vote store to /var/backups/cbw-votes/
# and keeps the newest 30 backups. Run by cbw-votes-backup.timer (root).
# Backups live outside the web root and are never publicly served.
set -eu

SRC="/var/lib/cbw-votes/votes.json"
DST_DIR="/var/backups/cbw-votes"
STAMP="$(date -u +%Y%m%d-%H%M%S)"

[ -f "$SRC" ] || { echo "cbw-votes-backup: source $SRC missing" >&2; exit 1; }
mkdir -p "$DST_DIR"
cp "$SRC" "$DST_DIR/votes-$STAMP.json"

# Keep the newest 30 backups
ls -1t "$DST_DIR"/votes-*.json 2>/dev/null | tail -n +31 | while read -r f; do rm -f "$f"; done

echo "cbw-votes-backup: saved votes-$STAMP.json ($(wc -c < "$DST_DIR/votes-$STAMP.json") bytes)"
