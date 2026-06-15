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

## 5א. פריסה אוטומטית (CI/CD) — פעם אחת
מוגדר ב‑`.github/workflows/deploy.yml`: כל `git push` ל‑`main` מריץ
`deploy/redeploy.sh` על השרת דרך SSH. הקמה חד‑פעמית:

**1) מפתח SSH ייעודי לפריסה (על המכונה המקומית שלך):**
```bash
ssh-keygen -t ed25519 -f deploy_key -N "" -C "github-actions-deploy"
```
זה יוצר `deploy_key` (פרטי) ו‑`deploy_key.pub` (ציבורי).

**2) הוסף את המפתח הציבורי לשרת (SSH פנימה כ‑ubuntu):**
```bash
cat deploy_key.pub >> ~/.ssh/authorized_keys
```

**3) ודא ש‑ubuntu יכול להריץ את ה‑restart בלי סיסמה** (ברירת המחדל ב‑Lightsail).
בדיקה על השרת: `sudo -n systemctl restart service-call-api` צריך לעבוד בלי בקשת סיסמה.
אם לא — הוסף:
```bash
echo 'ubuntu ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart service-call-api' | sudo tee /etc/sudoers.d/service-call-deploy
```

**4) הוסף Secrets ב‑GitHub** (Settings → Secrets and variables → Actions → New repository secret):
| שם | ערך |
|----|-----|
| `DEPLOY_HOST` | ה‑Static IP של Lightsail (או `service-call.newavera.co.il`) |
| `DEPLOY_USER` | `ubuntu` |
| `DEPLOY_SSH_KEY` | **כל התוכן** של הקובץ הפרטי `deploy_key` |

לאחר מכן מחק את `deploy_key` המקומי. מעכשיו כל push ל‑main פורס אוטומטית
(אפשר גם להריץ ידנית: Actions → Deploy to production → Run workflow).

## גיבוי
ה‑DB הוא קובץ יחיד: `/opt/service-call/database/servicecall.db`.
מומלץ Lightsail automatic snapshots, או גיבוי תקופתי של הקובץ.
