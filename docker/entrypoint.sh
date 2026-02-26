#!/bin/sh
set -eu

escape_js() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

first_non_empty_env() {
  for key in "$@"; do
    value=$(printenv "$key" 2>/dev/null || true)
    if [ -n "$value" ]; then
      printf '%s' "$value"
      return 0
    fi
  done
  printf ''
}

SUPABASE_URL=$(escape_js "$(first_non_empty_env VITE_SUPABASE_URL SUPABASE_URL)")
SUPABASE_ANON_KEY=$(escape_js "$(first_non_empty_env VITE_SUPABASE_ANON_KEY SUPABASE_ANON_KEY)")
GOOGLE_MAPS_API_KEY=$(escape_js "$(first_non_empty_env VITE_GOOGLE_MAPS_API_KEY GOOGLE_MAPS_API_KEY)")
GOOGLE_CALENDAR_CLIENT_ID=$(escape_js "$(first_non_empty_env VITE_GOOGLE_CALENDAR_CLIENT_ID GOOGLE_CALENDAR_CLIENT_ID)")
GOOGLE_CALENDAR_ID=$(escape_js "$(first_non_empty_env VITE_GOOGLE_CALENDAR_ID GOOGLE_CALENDAR_ID)")
APP_VERSION=$(escape_js "${APP_VERSION:-}")
APP_COMMIT_SHA=$(escape_js "${APP_COMMIT_SHA:-}")
APP_BUILD_TIME=$(escape_js "${APP_BUILD_TIME:-}")

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
  echo "[entrypoint] Supabase runtime env is missing. Checked VITE_SUPABASE_URL/SUPABASE_URL and VITE_SUPABASE_ANON_KEY/SUPABASE_ANON_KEY." >&2
fi
if [ -z "$GOOGLE_CALENDAR_CLIENT_ID" ]; then
  echo "[entrypoint] Google Calendar runtime env is missing. Checked VITE_GOOGLE_CALENDAR_CLIENT_ID/GOOGLE_CALENDAR_CLIENT_ID." >&2
fi

cat > /usr/share/nginx/html/runtime-config.js <<EOF
window.__WENDEAL_RUNTIME_CONFIG__ = {
  appVersion: "${APP_VERSION}",
  appCommit: "${APP_COMMIT_SHA}",
  appBuildTime: "${APP_BUILD_TIME}",
  supabase: {
    url: "${SUPABASE_URL}",
    anonKey: "${SUPABASE_ANON_KEY}"
  },
  googleMaps: {
    apiKey: "${GOOGLE_MAPS_API_KEY}"
  },
  googleCalendar: {
    clientId: "${GOOGLE_CALENDAR_CLIENT_ID}",
    calendarId: "${GOOGLE_CALENDAR_ID}"
  }
};
EOF

exec nginx -g 'daemon off;'
