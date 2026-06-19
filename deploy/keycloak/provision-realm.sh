#!/usr/bin/env bash
# Provision the Keycloak realm + client the app needs, against any Keycloak instance.
# Idempotent-ish. Requires: curl, python3.
#
# Env:
#   KC_URL        (default http://127.0.0.1:9090)
#   KC_ADMIN      (default admin)
#   KC_ADMIN_PW   (required)
#   REALM         (default Test_Cms)
#   CLIENT_ID     (default cms-backend)
#
# Prints the generated client secret on success (put it in Backend/.env).
set -euo pipefail
KC="${KC_URL:-http://127.0.0.1:9090}"
ADMIN="${KC_ADMIN:-admin}"
PW="${KC_ADMIN_PW:?set KC_ADMIN_PW}"
R="${REALM:-Test_Cms}"
CID="${CLIENT_ID:-cms-backend}"

echo "==> wait for Keycloak at $KC"
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w '%{http_code}' "$KC/realms/master/protocol/openid-connect/token" \
    -d grant_type=password -d client_id=admin-cli -d username="$ADMIN" -d "password=$PW" || echo 000)
  [ "$code" = "200" ] && { echo "  ready"; break; }
  sleep 3
done

TOKEN=$(curl -s -X POST "$KC/realms/master/protocol/openid-connect/token" \
  -d grant_type=password -d client_id=admin-cli -d username="$ADMIN" -d "password=$PW" \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')

echo "==> realm $R"
curl -s -o /dev/null -w "  realm http=%{http_code}\n" -X POST "$KC/admin/realms" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"realm\":\"$R\",\"enabled\":true}" || true

echo "==> user profile: enable unmanaged attributes + make firstName/lastName optional"
# KC26 strict profile would otherwise reject the app's custom attributes AND mark
# every app-created user (which has no first/last name) as 'not fully set up'.
curl -s "$KC/admin/realms/$R/users/profile" -H "Authorization: Bearer $TOKEN" | python3 -c '
import sys,json
d=json.load(sys.stdin)
for a in d.get("attributes",[]):
    if a.get("name") in ("firstName","lastName"): a.pop("required",None)
d["unmanagedAttributePolicy"]="ENABLED"
open("/tmp/up.json","w").write(json.dumps(d))'
curl -s -o /dev/null -w "  profile http=%{http_code}\n" -X PUT "$KC/admin/realms/$R/users/profile" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" --data @/tmp/up.json

echo "==> client $CID (confidential, direct access grants)"
curl -s -o /dev/null -w "  client http=%{http_code}\n" -X POST "$KC/admin/realms/$R/clients" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"clientId\":\"$CID\",\"enabled\":true,\"protocol\":\"openid-connect\",\"publicClient\":false,\"directAccessGrantsEnabled\":true,\"standardFlowEnabled\":true,\"serviceAccountsEnabled\":false,\"redirectUris\":[\"*\"],\"webOrigins\":[\"*\"]}" || true

UUID=$(curl -s "$KC/admin/realms/$R/clients?clientId=$CID" -H "Authorization: Bearer $TOKEN" \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)[0]["id"])')
SECRET=$(curl -s "$KC/admin/realms/$R/clients/$UUID/client-secret" -H "Authorization: Bearer $TOKEN" \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["value"])')
echo "KEYCLOAK_CLIENT_SECRET=$SECRET"
