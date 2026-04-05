# חכה למים עמוקים – שאלון זיהוי טמפרמנט

אפליקציית ווב לזיהוי טמפרמנט אישיותי, מבוססת על ארבעת הטמפרמנטים הקלאסיים.

## הטמפרמנטים

| סמל | שם | צבע |
|-----|----|-----|
| 🔥 | כולרי (C) | אדום |
| 🌬️ | סנגוויני (S) | צהוב |
| 💧 | פלגמטי (P) | כחול |
| 🌍 | מלנכולי (M) | סגול |

## מבנה האפליקציה

```
index.html          – דף בית
questionnaire.html  – שאלון 20 שאלות
results.html        – תוצאות ופרופיל אישי
style.css           – עיצוב (RTL, רספונסיבי)
app.js              – לוגיקה מלאה
data.js             – טעינת תוכן + שליחה ל-Google Sheets
content.json        – כל תוכן האפליקציה (שאלות, פרופילים, כרטיסי משני)
google_apps_script.gs – קוד Google Apps Script (פריסה נפרדת)
```

## זרימת המשתמש

1. דף הבית → לחיצה על "התחל שאלון"
2. 20 שאלות – ניתן לדלג, לחזור, לשנות תשובה
3. לאחר 12 תשובות לפחות – כפתור "סיים וקבל תוצאה"
4. מסך הכרזת תוצאה + גרף ניקוד
5. פרופיל אישי מלא ב-4 טאבים
6. דירוג + פידבק חופשי

## סוגי תוצאות

| סוג | תנאי |
|-----|------|
| pure | דומיננטי ≥ 60% |
| mixed_clear | דומיננטי 45–59% |
| mixed_unclear | דומיננטי 35–44% |
| ambiguous | דומיננטי < 35% |
| too_few | פחות מ-12 תשובות |

## הפעלה מקומית

האפליקציה דורשת שרת HTTP (לא ניתן לפתוח ישירות מהדיסק בגלל `fetch` לקובץ `content.json`).

**PowerShell:**
```powershell
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add('http://localhost:8080/')
$listener.Start()
# ולאחר מכן לשרת קבצים...
```

**Python (אם מותקן):**
```bash
python -m http.server 8080
```

לאחר מכן פתח: `http://localhost:8080`

## פריסה ל-GitHub Pages

1. צור repository חדש ב-GitHub
2. העלה את הקבצים הבאים:
   - `index.html`
   - `questionnaire.html`
   - `results.html`
   - `style.css`
   - `app.js`
   - `data.js`
   - `content.json`
3. Settings → Pages → Branch: main → Save
4. האפליקציה תהיה זמינה בכתובת: `https://<username>.github.io/<repo-name>/`

> **הערה:** `google_apps_script.gs` מופרס בנפרד ב-Google Apps Script ואינו חלק מה-GitHub Pages.

## חיבור Google Sheets

1. פתח את Google Sheet שלך
2. Extensions → Apps Script
3. הדבק את תוכן `google_apps_script.gs`
4. Deploy → New deployment → Web app (Execute as: Me, Who has access: Anyone)
5. העתק את ה-URL והכנס אותו ב-`data.js` תחת `SCRIPT_URL`

## טכנולוגיות

- HTML5 + CSS3 + JavaScript (Vanilla, ללא frameworks)
- RTL מלא (`dir="rtl"`, `lang="he"`)
- Google Apps Script לאחסון נתונים ב-Google Sheets
- `localStorage` לשמירת סשן ו-retry במקרה של כשל רשת
