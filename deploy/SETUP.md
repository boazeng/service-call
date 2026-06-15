# פריסה ל‑AWS Lightsail — service-call.newavera.co.il

שרת יחיד (Ubuntu) שמריץ את ה‑FastAPI עם SQLite, מגיש את ה‑React build דרך nginx,
עם HTTPS מ‑Let's Encrypt. אין RDS / CloudFront — פשוט וזול.

## 1. הקמת המכונה (פעם אחת)
נעשה דרך AWS CLI (ראה הפקודות שהורצו) או קונסול Lightsail:
- Ubuntu 22.04, תוכנית 1–2GB RAM, region `us-east-1`.
- Static IP מוקצה ומחובר.
- Firewall: פתוח 22 (SSH), 80 (HTTP), 443 (HTTPS).

## 2. DNS (אתה — אצל ספק ה‑DNS של newavera.co.il)
הוסף רשומת **A**:
```
service-call.newavera.co.il  →  <STATIC_IP של Lightsail>
```
המתן שתתפשט (בדיקה: `nslookup service-call.newavera.co.il`).

## 3. הגדרת השרת (SSH פנימה)
```bash
sudo apt-get update && sudo apt-get install -y python3-venv python3-pip nginx git nodejs npm

# קוד
sudo mkdir -p /opt/service-call && sudo chown ubuntu:ubuntu /opt/service-call
git clone https://github.com/boazeng/service-call.git /opt/service-call
cd /opt/service-call

# Backend
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.production.example .env       # ואז ערוך .env עם הסודות האמיתיים
.venv/bin/python -m app.bootstrap     # יוצר טבלאות + משתמש אדמין

# Frontend (build על השרת; דורש ~1GB RAM)
cd ../frontend
npm ci
npm run build

# systemd (שירות ה‑API)
sudo cp /opt/service-call/deploy/service-call-api.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now service-call-api
sudo systemctl status service-call-api --no-pager

# nginx
sudo cp /opt/service-call/deploy/nginx-service-call.conf /etc/nginx/sites-available/service-call
sudo ln -sf /etc/nginx/sites-available/service-call /etc/nginx/sites-enabled/service-call
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# HTTPS (אחרי שה‑DNS מצביע על השרת)
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d service-call.newavera.co.il --non-interactive --agree-tos -m boazen@gmail.com --redirect
```

## 4. ייבוא ראשוני מ‑Priority
היכנס ל‑https://service-call.newavera.co.il עם האדמין → מסך "סנכרון Priority" →
"ייבא מ‑Priority", ולשונית "מכשירים" → "ייבא מכשירים מ‑Priority".

## 5. עדכון גרסה (אחרי push ל‑GitHub)
```bash
cd /opt/service-call && git pull
cd backend && .venv/bin/pip install -r requirements.txt && .venv/bin/python -m app.bootstrap
cd ../frontend && npm ci && npm run build
sudo systemctl restart service-call-api
```
(או הרץ `deploy/redeploy.sh`).

## גיבוי
ה‑DB הוא קובץ יחיד: `/opt/service-call/database/servicecall.db`.
מומלץ Lightsail automatic snapshots, או גיבוי תקופתי של הקובץ.
