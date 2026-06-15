#!/usr/bin/env bash
# Pull latest, reinstall, rebuild frontend, restart the API. Run on the server.
set -euo pipefail
cd /opt/service-call
git pull
cd backend
.venv/bin/pip install -q -r requirements.txt
.venv/bin/python -m app.bootstrap
cd ../frontend
npm ci
npm run build
sudo systemctl restart service-call-api
echo "redeploy complete"
