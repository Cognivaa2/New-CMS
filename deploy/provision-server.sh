#!/usr/bin/env bash
# One-time bootstrap of a fresh Ubuntu 24.04 (x86_64) server for New-CMS.
# Installs Node 22, MongoDB 8, JDK 21 + Keycloak 26, nginx, swap.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
APT='apt-get -o DPkg::Lock::Timeout=600 -y'
KC_VER="${KC_VER:-26.6.3}"

cloud-init status --wait 2>/dev/null || true
$APT update
$APT install -y ca-certificates curl gnupg unzip git nginx ufw build-essential python3

# swap (safety net for builds)
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# Node 22
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  $APT install -y nodejs
fi

# MongoDB 8
if ! command -v mongod >/dev/null 2>&1; then
  curl -fsSL https://pgp.mongodb.com/server-8.0.asc | gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor
  echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" > /etc/apt/sources.list.d/mongodb-org-8.0.list
  $APT update && $APT install -y mongodb-org
fi
systemctl enable --now mongod

# JDK 21 + Keycloak
command -v java >/dev/null 2>&1 || $APT install -y openjdk-21-jre-headless
if [ ! -d "/opt/keycloak-$KC_VER" ]; then
  curl -fsSL -o /tmp/keycloak.zip "https://github.com/keycloak/keycloak/releases/download/$KC_VER/keycloak-$KC_VER.zip"
  unzip -q /tmp/keycloak.zip -d /opt
  ln -sfn "/opt/keycloak-$KC_VER" /opt/keycloak
  id keycloak >/dev/null 2>&1 || useradd -r -d /opt/keycloak -s /usr/sbin/nologin keycloak
  chown -R keycloak:keycloak "/opt/keycloak-$KC_VER"
fi

mkdir -p /opt/newcms /etc/newcms
echo "Provision complete. Next: place env files, install systemd units + nginx conf, run server-deploy.sh,"
echo "then deploy/keycloak/provision-realm.sh, then register the demo company."
