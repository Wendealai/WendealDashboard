#!/bin/sh
set -eu

escape_js() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

SUPABASE_URL=$(escape_js "${VITE_SUPABASE_URL:-}")
SUPABASE_ANON_KEY=$(escape_js "${VITE_SUPABASE_ANON_KEY:-}")
GOOGLE_MAPS_API_KEY=$(escape_js "${VITE_GOOGLE_MAPS_API_KEY:-}")
GOOGLE_CALENDAR_CLIENT_ID=$(escape_js "${VITE_GOOGLE_CALENDAR_CLIENT_ID:-}")
GOOGLE_CALENDAR_ID=$(escape_js "${VITE_GOOGLE_CALENDAR_ID:-}")

cat > /usr/share/nginx/html/runtime-config.js <<EOF
window.__WENDEAL_RUNTIME_CONFIG__ = {
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
