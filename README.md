# TACT · מערכת קריאות שירות (Service-Call)

אפליקציה עצמאית לניהול קריאות שירות של TACT. בוטים חיצוניים (אחזקה / אנרגיה) שולחים
קריאות אל המערכת דרך API; מוקדנים רואים, עורכים ופותחים אותן ב‑Priority; והמערכת
מסתנכרנת דו‑כיוונית עם Priority כך שהרשימה כאן תואמת את Priority, פרט לקריאות בוט
שטרם הועברו.

> הבוטים עצמם **אינם** חלק מהפרויקט — כאן קיימת רק נקודת הקצה הנכנסת המאובטחת ב‑API Key.

## Stack
- **Backend:** FastAPI + SQLAlchemy 2.0 + Pydantic 2 (SQLite מקומי / Postgres בענן)
- **Frontend:** React 18 + Vite + TypeScript + Tailwind 3 + מערכת העיצוב של TACT (RTL)
- **Auth:** JWT (אימייל+סיסמה) לניהול; `X-API-Key` לבוטים

## הרצה מקומית
```bash
# Backend (port 8020)
cd backend
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --port 8020 --reload

# Frontend (port 5300)
cd frontend
npm install
npm run dev
```
פתח http://localhost:5300 — כניסת פיתוח: `admin@tact.co.il` / `admin123`
(מנהל), `operator@tact.co.il` / `operator123` (מוקדן).

## ארכיטקטורה
- מודל הליבה `ServiceCall`: קריאה היא **"מקומית בלבד"** כל עוד `priority_doc_number IS NULL`.
- `services/sync_service.py` — לב הסנכרון: `push_call` (החוצה ל‑Priority),
  `pull_all` (פנימה; קיימות מתעדכנות לפי `priority_doc_number`, חדשות נוספות כ‑`source=priority`).
- `services/priority_service.py` — לקוח Priority. `PRIORITY_USE_MOCK=true` (ברירת מחדל)
  מחזיר נתוני הדמיה עד שמחברים credentials אמיתיים; מיפוי השדות מרוכז ב‑`_map_in`/`_map_out`.

## חיבור Priority אמיתי
ערוך את `backend/.env` (ראה `.env.example`): `PRIORITY_USE_MOCK=false` ומלא
`PRIORITY_BASE_URL`, `PRIORITY_COMPANY`, `PRIORITY_USER`, `PRIORITY_PASSWORD`,
`PRIORITY_SERVICE_ENTITY`. התאם שמות שדות ב‑`_map_in`/`_map_out` שב‑`priority_service.py`.

## שליחת קריאה מבוט
```
POST /api/v1/service-calls
X-API-Key: <המפתח שנוצר במסך "מפתחות בוטים">
{ "title": "...", "description": "...", "customer_name": "...",
  "site": "...", "urgency": "high", "external_id": "BOT-001" }
```
`external_id` מבטיח dedup בניסיונות חוזרים.

## ענן (בהמשך)
מבנה תואם AWS SAM (Lambda + RDS + CloudFront) כמו ב‑tact-crm-db; ייווסף לפני העלאה.
