// data.js – טעינת content.json וחיבור ל-Google Sheets

// ─── content.json ────────────────────────────────────────────────────────────

let contentData = null;

async function loadContent() {
  const res = await fetch('content.json');
  if (!res.ok) throw new Error('לא ניתן לטעון את content.json (HTTP ' + res.status + ')');
  contentData = await res.json();
  return contentData;
}

function getQuestion(index)              { return contentData.questions[index]; }
function getTotalQuestions()             { return contentData.questions.length; }
function getProfile(temperament)         { return contentData.profiles[temperament]; }
function getSecondaryCard(dom, sec)      { return contentData.secondary_cards[dom + sec] || null; }

// ─── Google Sheets ────────────────────────────────────────────────────────────

// הכנס כאן את ה-URL לאחר פריסת ה-Apps Script
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwdJi3dlXQP5sVkUqGOHXntYCV-STiRNoThbFUUk4x89C1IqWXvSzXHgkoCXq73abJ6uA/exec";

// ─── buildPayload – בנה את מטען הנתונים מהסשן ───────────────────────────────

function buildPayload(session) {
  return {
    sessionId: session.sessionId,
    startTime: session.startTime,
    scores:    session.scores,
    answers:   session.answers,
    result:    session.result || {},
    userAgent: navigator.userAgent
  };
}

// ─── sendToSheets – שלח נתונים ל-Google Sheets ───────────────────────────────
//
// משתמש ב-mode:'no-cors' כי Apps Script אינו שולח CORS headers.
// אנחנו לא קוראים את התגובה – רק שולחים.
// אם נכשל: שומר ב-localStorage לשליחה עתידית.

async function sendToSheets(session) {
  if (!SCRIPT_URL) return;   // לא הוגדר URL – דלג בשקט

  const payload = buildPayload(session);

  try {
    await fetch(SCRIPT_URL, {
      method:  'POST',
      mode:    'no-cors',     // Apps Script אינו מחזיר CORS headers
      headers: { 'Content-Type': 'text/plain' },   // text/plain לא מפעיל preflight
      body:    JSON.stringify(payload)
    });
    // no-cors לא מאפשר קריאת תגובה – אם לא נזרקה שגיאה, ייתכן שהצליח
    clearPending(session.sessionId);

  } catch (err) {
    savePending(session);
  }
}

// ─── retry – שלח מחדש שורות תקועות מה-localStorage ──────────────────────────

async function retryPending() {
  if (!SCRIPT_URL) return;

  const keys = Object.keys(localStorage).filter(k => k.startsWith('pending_'));
  for (const key of keys) {
    try {
      const session = JSON.parse(localStorage.getItem(key));
      await sendToSheets(session);
    } catch (_) { /* נשאיר לפעם הבאה */ }
  }
}

// ─── עזרים מקומיים ───────────────────────────────────────────────────────────

function savePending(session) {
  try {
    localStorage.setItem('pending_' + session.sessionId, JSON.stringify(session));
  } catch (_) { /* localStorage מלא – התעלם */ }
}

function clearPending(sessionId) {
  localStorage.removeItem('pending_' + sessionId);
}
