// app.js – לוגיקת השאלון, הסשן והתוצאות

// ─── עזרים ───────────────────────────────────────────────────────────────────

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function shuffleArray(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

const CATEGORY_LABELS = {
  physical:    'פיזי',
  situational: 'מצבי',
  theoretical: 'תיאורטי',
  social:      'חברתי'
};

// ─── מצב סשן ─────────────────────────────────────────────────────────────────

const session = {
  sessionId:     generateUUID(),
  startTime:     Date.now(),
  answers:       {},  // { questionId: { temperament, timeSpent, changed, feedback, timestamp } }
  scores:        { C: 0, S: 0, P: 0, M: 0 },
  result:        null,
  _shuffleCache: {}   // סדר ערבוב קבוע לכל שאלה
};

// ─── מצב השאלון ──────────────────────────────────────────────────────────────

let currentIndex      = 0;
let questionStartTime = Date.now();

// ─── recordAnswer – לב הלוגיקה ───────────────────────────────────────────────
//
// מקבלת questionId, temperament ומחשבת timeSpent בעצמה.
// מורידה ניקוד ישן אם ענו קודם, ומוסיפה ניקוד חדש.
// שומרת timestamp, changed ו-feedback הקיים.

function recordAnswer(questionId, temperament) {
  const timeSpent   = Date.now() - questionStartTime;
  const prev        = session.answers[questionId];
  const wasAnswered = !!prev;

  // הסר ניקוד ישן
  if (wasAnswered) {
    session.scores[prev.temperament]--;
  }

  // שמור תשובה
  session.answers[questionId] = {
    temperament,
    timeSpent,
    changed:   wasAnswered,
    feedback:  wasAnswered ? prev.feedback : '',
    timestamp: Date.now()
  };

  session.scores[temperament]++;
}

// ─── שמירת זמן ופידבק לשאלה הנוכחית ─────────────────────────────────────────
//
// נקראת לפני כל מעבר (navigate, submit) כדי לעדכן timeSpent ופידבק.

function flushCurrentQuestion() {
  const q    = getQuestion(currentIndex);
  const prev = session.answers[q.id];
  if (prev) {
    prev.timeSpent = Date.now() - questionStartTime;
    prev.feedback  = document.getElementById('q-feedback').value.trim();
  }
}

// ─── רינדור שאלה ─────────────────────────────────────────────────────────────

function renderQuestion(index) {
  const q     = getQuestion(index);
  const total = getTotalQuestions();

  // ── progress bar ──
  const pct = Math.round((index / total) * 100);
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-text').textContent = `שאלה ${index + 1} מתוך ${total}`;
  document.getElementById('progress-pct').textContent  = pct + '%';

  // ── מטא ──
  document.getElementById('q-category').textContent = CATEGORY_LABELS[q.category] || q.category;
  document.getElementById('q-topic').textContent    = q.topic;
  document.getElementById('q-text').textContent     = q.question;

  // ── ערבוב תשובות (קבוע לכל ביקור באותה שאלה) ──
  if (!session._shuffleCache[q.id]) {
    session._shuffleCache[q.id] = shuffleArray(q.answers);
  }
  const answers = session._shuffleCache[q.id];

  // ── בנה כפתורי תשובה ──
  const container = document.getElementById('answers-container');
  container.innerHTML = '';
  answers.forEach(answer => {
    const btn = document.createElement('button');
    btn.className          = 'answer-btn';
    btn.textContent        = answer.text;
    btn.dataset.temperament = answer.temperament;
    btn.addEventListener('click', () => onAnswerClick(btn, answer.temperament, q.id));
    container.appendChild(btn);
  });

  // ── שחזור בחירה קיימת ──
  const prev = session.answers[q.id];
  if (prev) {
    container.querySelectorAll('.answer-btn').forEach(btn => {
      if (btn.dataset.temperament === prev.temperament) {
        btn.classList.add('selected');
      }
    });
    document.getElementById('q-feedback').value = prev.feedback || '';
  } else {
    document.getElementById('q-feedback').value = '';
  }

  // ── ניווט ──
  document.getElementById('btn-prev').disabled = (index === 0);
  document.getElementById('btn-next').disabled = (index === total - 1);

  // כפתור "דלג" – נסתר בשאלה האחרונה (שם יש "סיים")
  const skipBtn = document.getElementById('btn-skip');
  if (skipBtn) skipBtn.style.visibility = (index === total - 1) ? 'hidden' : 'visible';

  // ── כפתור סיום – מופיע רק בשאלה האחרונה ──
  document.getElementById('submit-wrap').style.display =
    (index === total - 1) ? 'block' : 'none';
  document.getElementById('submit-error').classList.remove('visible');

  // ── עדכוני UI ──
  updateAnsweredCount();

  // ── אפס טיימר ──
  questionStartTime = Date.now();
}

// ─── לחיצה על תשובה ──────────────────────────────────────────────────────────

function onAnswerClick(clickedBtn, temperament, questionId) {
  // הדגשה ויזואלית
  document.querySelectorAll('.answer-btn').forEach(b => b.classList.remove('selected'));
  clickedBtn.classList.add('selected');

  // רישום התשובה
  recordAnswer(questionId, temperament);

  // עדכן UI
  updateAnsweredCount();
}

// ─── ניווט ───────────────────────────────────────────────────────────────────

function navigate(direction) {
  // שמור זמן + פידבק לפני מעבר
  flushCurrentQuestion();

  const next = currentIndex + direction;
  if (next < 0 || next >= getTotalQuestions()) return;

  currentIndex = next;
  renderQuestion(currentIndex);
}

// ─── מונה תשובות ─────────────────────────────────────────────────────────────

function updateAnsweredCount() {
  const el = document.getElementById('answered-count');
  if (!el) return;
  const count = Object.keys(session.answers).length;
  const total = getTotalQuestions();
  if (count === 0) {
    el.innerHTML = '';
    return;
  }
  const color = count >= 12 ? '#27AE60' : '#E67E22';
  el.innerHTML = `ענית על <span style="color:${color};font-weight:bold;">${count}</span> מתוך ${total} שאלות`;
}

// ─── שליחה ───────────────────────────────────────────────────────────────────

function submitQuestionnaire() {
  // שמור זמן + פידבק לשאלה הנוכחית לפני בדיקה
  flushCurrentQuestion();

  const answered = Object.keys(session.answers).length;

  if (answered < 12) {
    const errCount = document.getElementById('err-count');
    if (errCount) errCount.textContent = answered;
    document.getElementById('submit-error').classList.add('visible');
    return;
  }

  // חשב תוצאה לפני השמירה והשליחה
  calculateResult();

  // שמור סשן ועבור לתוצאות
  localStorage.setItem('temperament_session', JSON.stringify(session));

  // שלח ל-Google Sheets (לא מחכים – רץ ברקע)
  sendToSheets(session).catch(() => {});

  window.location.href = 'results.html';
}

// ─── calculateResult ─────────────────────────────────────────────────────────

function calculateResult() {
  const answered = Object.keys(session.answers).length;

  if (answered < 12) {
    return { status: 'too_few', answered };
  }

  // אחוז לכל טמפרמנט
  const percentages = {};
  for (const t of ['C', 'S', 'P', 'M']) {
    percentages[t] = Math.round((session.scores[t] / answered) * 100);
  }

  // מיין מגבוה לנמוך
  const sorted    = Object.entries(percentages).sort((a, b) => b[1] - a[1]);
  const dominant  = sorted[0][0];
  const score     = sorted[0][1];
  const secondary = sorted[1][0];

  // קבע סוג
  let type;
  if      (score >= 60) type = 'pure';
  else if (score >= 45) type = 'mixed_clear';
  else if (score >= 35) type = 'mixed_unclear';
  else                  type = 'ambiguous';

  session.result = { dominant, secondary, score, type, percentages, answered };
  return session.result;
}

// ─── הצגת מסך הכרזה ──────────────────────────────────────────────────────────

const TYPE_LABELS = {
  pure:          'טמפרמנט דומיננטי',
  mixed_clear:   'צירוף ברור',
  mixed_unclear: 'צירוף מורכב',
  ambiguous:     'תמונה מעורבת',
  too_few:       'נדרשות עוד תשובות'
};

const TYPE_EXPLANATIONS = {
  pure:          'יש לך טמפרמנט דומיננטי ברור. הפרופיל למטה מתאר אותך בצורה הישירה ביותר.',
  mixed_clear:   'הטמפרמנט הדומיננטי שלך בולט, אבל הטמפרמנט המשני מוסיף לו שכבה משמעותית.',
  mixed_unclear: 'שני טמפרמנטים משפיעים עליך בצורה דומה. הפרופיל המשני חשוב לא פחות.',
  ambiguous:     'הציונים שלך מפוזרים בין כמה טמפרמנטים. קרא את כולם – לפחות שניים יתחברו אליך.'
};

function displayAnnouncement(result) {
  // מסך too_few
  if (result.status === 'too_few') {
    document.getElementById('toofew-count').textContent    = result.answered;
    document.getElementById('toofew-answered').textContent = result.answered;
    document.getElementById('screen-too-few').style.display = 'block';
    return;
  }

  const profile = getProfile(result.dominant);

  // אמוג'י + שם + spark
  document.getElementById('ann-emoji').textContent = profile.emoji;
  document.getElementById('ann-name').textContent  = profile.name;
  document.getElementById('ann-spark').textContent = profile.spark;

  // תווית סוג
  const badge = document.getElementById('ann-type-badge');
  badge.textContent = TYPE_LABELS[result.type];
  badge.className   = 'type-label type-' + result.type;

  // פס צבע
  document.getElementById('ann-color-bar').style.background = `var(--color-${result.dominant})`;

  // טמפרמנט משני (לא בפיור)
  if (result.type !== 'pure' && result.type !== 'ambiguous') {
    const secProfile = getProfile(result.secondary);
    const secEl      = document.getElementById('ann-secondary');
    secEl.innerHTML  = `הטמפרמנט המשני שלך: <strong>${secProfile.emoji} ${secProfile.name}</strong>`;
    secEl.style.display = 'block';
  }

  // הסבר
  document.getElementById('ann-explanation').textContent =
    TYPE_EXPLANATIONS[result.type] || '';

  // גרף עמודות
  for (const t of ['C', 'S', 'P', 'M']) {
    const pct = result.percentages[t];
    document.getElementById('bar-' + t).style.width  = pct + '%';
    document.getElementById('pct-' + t).textContent  = pct + '%';
  }

  document.getElementById('screen-announcement').style.display = 'block';
}

// ─── מעבר לפרופיל המלא (שלב 6) ──────────────────────────────────────────────

function showFullProfile() {
  document.getElementById('screen-announcement').style.display = 'none';
  document.getElementById('screen-profile').style.display      = 'block';
  window.scrollTo(0, 0);
  populateProfile(session.result);
}

// ─── populateProfile – מלא את מסך הפרופיל ───────────────────────────────────

function populateProfile(result) {
  if (!result || result.status === 'too_few') return;

  const profile    = getProfile(result.dominant);
  const isMixed    = (result.type === 'mixed_clear' || result.type === 'mixed_unclear');
  const secCard    = isMixed ? getSecondaryCard(result.dominant, result.secondary) : null;
  const secProfile = isMixed ? getProfile(result.secondary) : null;

  // ── כותרת ──
  document.getElementById('prof-emoji').textContent = profile.emoji;
  document.getElementById('prof-name').textContent  = profile.name;
  document.getElementById('prof-spark').textContent = profile.spark;

  // ── מילוי 4 טאבים ──
  const TAB_KEYS = ['built', 'relations', 'works', 'growth'];

  TAB_KEYS.forEach(key => {
    const listEl = document.getElementById('list-' + key);
    listEl.innerHTML = '';

    // הסר כרטיסי משני ישנים מהטאב הזה
    const tabEl = document.getElementById('tab-' + key);
    tabEl.querySelectorAll('.secondary-inline').forEach(el => el.remove());

    // ── תוכן ראשי ──
    (profile[key] || []).forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      listEl.appendChild(li);
    });

    // ── קטע "ניצוץ המשני" – רק אם מעורב ויש תוכן ──
    if (secCard && secCard[key] && secCard[key].length > 0) {
      const secDiv = document.createElement('div');
      secDiv.className = 'secondary-inline secondary-card';
      secDiv.style.marginTop        = '18px';
      secDiv.style.borderRightColor = `var(--color-${result.secondary})`;

      const title = document.createElement('h3');
      title.style.marginBottom = '10px';
      title.innerHTML =
        `${secProfile.emoji} מה ${secProfile.name} מוסיף`;
      secDiv.appendChild(title);

      const secList = document.createElement('ul');
      secList.className = 'profile-list';
      secCard[key].forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        secList.appendChild(li);
      });
      secDiv.appendChild(secList);
      tabEl.appendChild(secDiv);
    }
  });

  // ── שאלת כיול – רק לטהורים ──
  document.getElementById('rating-card').style.display =
    result.type === 'pure' ? 'block' : 'none';

  // ── פתח טאב ראשון ──
  switchTab('built', document.querySelector('.tab-btn'));
}

// ─── טאבים (עובד בתוך #screen-profile בלבד) ──────────────────────────────────

function switchTab(name, clickedBtn) {
  const profileScreen = document.getElementById('screen-profile');
  if (!profileScreen) return;

  profileScreen.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  profileScreen.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

  const target = document.getElementById('tab-' + name);
  if (target) target.classList.add('active');
  if (clickedBtn) clickedBtn.classList.add('active');
}

// ─── כוכבי דירוג ─────────────────────────────────────────────────────────────

let selectedRating = 0;

function rateStar(n) {
  selectedRating = n;
  document.querySelectorAll('#stars-container .star').forEach((s, i) => {
    s.classList.toggle('active', i < n);
  });
  if (session.result) session.result.profileRating = n;
  localStorage.setItem('temperament_session', JSON.stringify(session));
  sendToSheets(session).catch(() => {});

  // אישור ויזואלי
  const confirm = document.getElementById('rating-confirm');
  if (confirm) confirm.style.display = 'inline';
}

// ─── שליחת פידבק ─────────────────────────────────────────────────────────────

function submitProfileFeedback() {
  const textarea = document.getElementById('profile-feedback');
  const text = textarea ? textarea.value.trim() : '';

  if (!text) return;  // אל תשלח ריק

  if (session.result) session.result.profileFeedback = text;
  localStorage.setItem('temperament_session', JSON.stringify(session));

  // שלח מחדש ל-Google Sheets עם הפידבק המעודכן
  sendToSheets(session).catch(() => {});

  // אישור ויזואלי
  const confirm = document.getElementById('feedback-confirm');
  if (confirm) confirm.style.display = 'inline';
  if (textarea) textarea.disabled = true;
}

// ─── מצב פיתוח: יצירת סשן מדומה לבדיקה ──────────────────────────────────────

const MOCK_SESSIONS = {
  pure: {
    answers: Object.fromEntries(
      Array.from({length: 20}, (_, i) => [i + 1, {
        temperament: i < 14 ? 'C' : i < 17 ? 'S' : i < 19 ? 'P' : 'M',
        timeSpent: 4000, changed: false, feedback: '', timestamp: Date.now()
      }])
    ),
    scores: { C: 14, S: 3, P: 2, M: 1 }
  },
  mixed_clear: {
    answers: Object.fromEntries(
      Array.from({length: 20}, (_, i) => [i + 1, {
        temperament: i < 10 ? 'C' : i < 16 ? 'S' : i < 18 ? 'P' : 'M',
        timeSpent: 4000, changed: false, feedback: '', timestamp: Date.now()
      }])
    ),
    scores: { C: 10, S: 6, P: 2, M: 2 }
  },
  mixed_unclear: {
    answers: Object.fromEntries(
      Array.from({length: 20}, (_, i) => [i + 1, {
        temperament: i < 8 ? 'C' : i < 15 ? 'S' : i < 18 ? 'P' : 'M',
        timeSpent: 4000, changed: false, feedback: '', timestamp: Date.now()
      }])
    ),
    scores: { C: 8, S: 7, P: 3, M: 2 }
  },
  ambiguous: {
    answers: Object.fromEntries(
      Array.from({length: 20}, (_, i) => [i + 1, {
        temperament: ['C','S','P','M'][i % 4],
        timeSpent: 4000, changed: false, feedback: '', timestamp: Date.now()
      }])
    ),
    scores: { C: 5, S: 5, P: 5, M: 5 }
  },
  too_few: {
    answers: Object.fromEntries(
      Array.from({length: 5}, (_, i) => [i + 1, {
        temperament: 'C', timeSpent: 3000, changed: false, feedback: '', timestamp: Date.now()
      }])
    ),
    scores: { C: 5, S: 0, P: 0, M: 0 }
  }
};

function testResult(type) {
  const mock = MOCK_SESSIONS[type];
  Object.assign(session.answers, mock.answers);
  Object.assign(session.scores,  mock.scores);
  session.result = null;
  // נקה מסכים
  ['screen-too-few','screen-announcement','screen-profile'].forEach(id => {
    document.getElementById(id).style.display = 'none';
  });
  initResultsPage();
}

// ─── אתחול דף תוצאות ─────────────────────────────────────────────────────────

function initResultsPage() {
  const result = calculateResult();
  displayAnnouncement(result);
}

// ─── אתחול ───────────────────────────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('question-card')) return;

  loadContent()
    .then(() => {
      document.getElementById('loading-screen').style.display       = 'none';
      document.getElementById('questionnaire-content').style.display = 'block';
      renderQuestion(0);
    })
    .catch(err => {
      document.getElementById('loading-screen').innerHTML =
        `<span style="color:#c0392b;">שגיאה בטעינת השאלון:<br>${err.message}</span>`;
    });
});

// ─── אתחול דף תוצאות ─────────────────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('screen-announcement')) return;

  // פאנל פיתוח
  if (new URLSearchParams(window.location.search).get('dev') === '1') {
    document.getElementById('dev-panel').style.display = 'block';
  }

  loadContent()
    .then(() => {
      // טען סשן מ-localStorage (מגיע מהשאלון)
      const raw = localStorage.getItem('temperament_session');
      if (raw) {
        const saved = JSON.parse(raw);
        Object.assign(session.answers, saved.answers || {});
        Object.assign(session.scores,  saved.scores  || {});
      }
      initResultsPage();
    })
    .catch(err => {
      document.getElementById('screen-announcement').innerHTML =
        `<div class="card" style="color:#c0392b;text-align:center;padding:32px;">שגיאה בטעינה: ${err.message}</div>`;
      document.getElementById('screen-announcement').style.display = 'block';
    });
});
