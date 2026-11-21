#!/usr/bin/env bash
# GET de solo lectura a la API de EasyBroker. Imprime el JSON formateado.
#
#   eb-get.sh '/properties?limit=2&search[statuses][]=published'   # producción (key de .env)
#   eb-get.sh --staging '/properties?limit=2'                       # staging (key pública)
#
# La key nunca se imprime. Solo GET: para POST de prueba usar curl contra staging.
set -euo pipefail

STAGING_KEY="l7u502p8v46ba3ppgvj5y2aad50lb9" # pública, documentada por EasyBroker

if [[ "${1:-}" == "--staging" ]]; then
  base="https://api.stagingeb.com/v1"
  key="$STAGING_KEY"
  shift
else
  base="https://api.easybroker.com/v1"
  root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
  key="$(grep -E '^EB_API_KEY=' "$root/.env" 2>/dev/null | head -1 | cut -d= -f2- | tr -d "\"' \r")"
  if [[ -z "$key" ]]; then
    echo "No se encontró EB_API_KEY en $root/.env" >&2
    exit 1
  fi
fi

path="${1:?Uso: eb-get.sh [--staging] '/path?query'}"
[[ "$path" == /* ]] || path="/$path"

body="$(mktemp)"
trap 'rm -f "$body"' EXIT

# -g: no interpretar [] como glob de curl
status="$(curl -g -sS -o "$body" -w '%{http_code}' \
  -H "X-Authorization: $key" -H "Accept: application/json" "$base$path")"

echo "HTTP $status  GET $base$path" >&2
if command -v python3 >/dev/null; then
  python3 -m json.tool --no-ensure-ascii "$body" 2>/dev/null || cat "$body"
else
  cat "$body"
fi
