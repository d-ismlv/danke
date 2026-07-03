#!/bin/sh
set -e

: "${PORT:=32323}"
: "${DANKE_DATA_DIR:=/app/data}"

mkdir -p "$DANKE_DATA_DIR"

if [ -z "$AUTH_PASSWORD" ]; then
  echo "[danke] WARNING: AUTH_PASSWORD is not set — nobody will be able to log in."
fi

# Provision a session secret automatically if the user didn't supply one, and
# persist it in the data volume so sessions survive restarts. This keeps the
# secret out of the public compose example (where a fixed default would let
# anyone forge a login cookie).
if [ -z "$AUTH_SESSION_TOKEN" ]; then
  token_file="$DANKE_DATA_DIR/.session_token"
  if [ ! -s "$token_file" ]; then
    node -e "console.log(require('crypto').randomBytes(24).toString('hex'))" > "$token_file"
  fi
  AUTH_SESSION_TOKEN="$(cat "$token_file")"
  export AUTH_SESSION_TOKEN
fi

node scripts/migrate.mjs
exec node_modules/.bin/next start -p "$PORT" -H 0.0.0.0
