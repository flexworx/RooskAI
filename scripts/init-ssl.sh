#!/usr/bin/env bash
# Byrth Platform — Initial SSL certificate provisioning via Let's Encrypt
# Usage: ./scripts/init-ssl.sh [email] [domain]
#
# Prerequisites: docker compose must be running (nginx + certbot services)

set -euo pipefail

EMAIL="${1:-admin@byrth.net}"
DOMAIN="${2:-byrth.net}"

echo "=== Byrth SSL Init ==="
echo "Domain: ${DOMAIN}"
echo "Email:  ${EMAIL}"
echo ""

# Obtain initial certificate
docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "${EMAIL}" \
  --agree-tos \
  --no-eff-email \
  -d "${DOMAIN}" \
  -d "www.${DOMAIN}"

# Reload nginx to pick up new certs
docker compose exec nginx nginx -s reload

echo ""
echo "SSL certificate provisioned for ${DOMAIN}"
echo "Auto-renewal is handled by the certbot service."
