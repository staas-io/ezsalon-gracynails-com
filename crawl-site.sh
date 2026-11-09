#!/usr/bin/env bash
# Usage: scripts/crawl-site.sh <sitemap-url> [out-dir]
# Saves every sitemap URL as a self-contained static HTML file (single-file-cli).
# Serve with: bunx serve <out-dir>
# Env: CHROME_PATH overrides the Chromium binary (default: Playwright cache).
set -euo pipefail

SITEMAP_URL="${1:?usage: $0 <sitemap-url> [out-dir]}";
HOST="$(echo "$SITEMAP_URL" | awk -F/ '{print $3}')";
OUT_DIR="${2:-sites/${HOST#www.}}";
CHROME_PATH="${CHROME_PATH:-$(ls -d "$HOME"/.cache/ms-playwright/chromium-*/chrome-linux*/chrome 2>/dev/null | sort -V | tail -1)}";

[ -x "$CHROME_PATH" ] || { echo "Chromium not found. Run 'npx playwright install chromium' or set CHROME_PATH." >&2; exit 1; }

mkdir -p "$OUT_DIR";
URLS="$(curl -fsSL "$SITEMAP_URL" | grep -oP '(?<=<loc>)[^<]+')";
[ -n "$URLS" ] || { echo "No <loc> entries in $SITEMAP_URL" >&2; exit 1; }

FAILED=0;
while read -r URL; do
	PATH_PART="$(echo "$URL" | sed -E 's|^https?://[^/]+||; s|[?#].*||; s|/+$||')";
	FILE="${PATH_PART:-/index}.html";
	DEST="$OUT_DIR$FILE";
	mkdir -p "$(dirname "$DEST")";
	echo "-> $URL  =>  $DEST";
	if ! timeout 120 npx -y single-file-cli "$URL" "$DEST" \
		--browser-executable-path="$CHROME_PATH" \
		--browser-args='["--no-sandbox"]' \
		--browser-wait-until=networkIdle; then
		echo "FAILED: $URL" >&2;
		FAILED=$((FAILED + 1));
	fi
done <<< "$URLS"

BARE_HOST="$(echo "${HOST#www.}" | sed 's/\./\\./g')";
find "$OUT_DIR" -name '*.html' -print0 | xargs -0 perl -pi -e "
	s{(<a\b[^>]*?\bhref=[\"']?)https?://(?:www\.)?$BARE_HOST(?=/)}{\$1}g;
	s{(<a\b[^>]*?\bhref=[\"']?)https?://(?:www\.)?$BARE_HOST(?=[\"' >])}{\$1/}g;
";

echo "Done. Output: $OUT_DIR (failed: $FAILED). Serve: bunx serve $OUT_DIR";
[ "$FAILED" -eq 0 ];
