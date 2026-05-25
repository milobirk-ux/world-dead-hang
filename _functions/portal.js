// WDHC Athlete Portal API — Cloudflare Worker v2.1
// Full backend: auth, profile, PR submission, approval, leaderboard sync, social cards

let _env = null;
function creds() { if (!_env) throw new Error('Env not init'); return _env; }

const SPREADSHEET_ID = '1qt-KNdOMareAl2Si6WRVAuTox7avV3gGAa7zdP6EW-s';
const DASHBOARD_URL = 'https://worlddeadhang.com/athlete-portal/dashboard.html';
const LEADERBOARD_URL = 'https://worlddeadhang.com/index.html';

// === OAUTH ===
async function getAccessToken() {
  const c = creds();
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: c.GOOGLE_CLIENT_ID, client_secret: c.GOOGLE_CLIENT_SECRET, refresh_token: c.GOOGLE_REFRESH_TOKEN, grant_type: 'refresh_token' }),
  });
  const d = await r.json();
  if (!d.access_token) throw new Error(`Token failed: ${JSON.stringify(d)}`);
  return d.access_token;
}

// === SHEETS ===
async function readSheet(tok, range) {
  const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}`, { headers: { 'Authorization': `Bearer ${tok}` } });
  return (await r.json()).values || [];
}
async function appendRow(tok, range, vals) {
  return fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}:append?valueInputOption=USER_ENTERED`,
    { method: 'POST', headers: { 'Authorization': `Bearer ${tok}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ values: [vals] }) });
}
async function updateCell(tok, range, val) {
  return fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?valueInputOption=USER_ENTERED`,
    { method: 'PUT', headers: { 'Authorization': `Bearer ${tok}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ values: [[val]] }) });
}

// === TIME ===
function parseTimeSec(t) {
  if (!t) return 0; let s = String(t).trim().replace('.', ':');
  if (s.includes(':')) { const p = s.split(':'); return (parseInt(p[0]) || 0) * 60 + (parseInt(p[1]) || 0); }
  const n = parseFloat(s); return n < 30 ? Math.round(n * 60) : Math.round(n);
}
function fmtTime(sec) { const m = Math.floor(sec / 60), s = sec % 60; return `${m}:${s.toString().padStart(2, '0')}`; }

// === GRIP AGE v2 ===
function calcGripAge(dob, weight, gender, sec, height, training) {
  if (!sec) return '--';
  let age = 35;
  if (dob) { try { const b = new Date(dob); if (!isNaN(b.getTime())) age = Math.floor((Date.now() - b.getTime()) / (365.25 * 864e5)); } catch(e) {} }
  const isF = (gender || '').toLowerCase().includes('female');
  const refW = isF ? 140 : 180, refH = isF ? 65 : 70;
  const w = parseFloat(weight) || refW, h = parseFloat(height) || refH;
  const tr = (training || 'None').trim();
  const tM = tr === 'Advanced' ? 1.22 : tr === 'Intermediate' ? 1.15 : tr === 'Beginner' ? 1.08 : 1.0;
  const base = isF ? 108 - 0.95 * age + 0.005 * age * age : 142 - 1.15 * age + 0.006 * age * age;
  const adj = (base * Math.pow(refW / w, 0.7) * Math.pow(refH / h, 0.35) * tM * 0.7) + (base * 0.3);
  const pr = sec / Math.max(1, adj);
  const delta = pr >= 1 ? 18 * Math.log(Math.max(1, pr)) : -12 * (1 - pr);
  return Math.max(18, Math.min(95, Math.round((age - delta) * 10) / 10));
}

// === TIER ===
function getTier(sec) {
  if (sec >= 360) return { tier: 'Freak', next: '', nextSec: 0, color: '#9900ff', pop: '.001%' };
  if (sec >= 240) return { tier: 'Legend', next: 'Freak', nextSec: 360, color: '#D4AF37', pop: '0.01%' };
  if (sec >= 180) return { tier: 'Elite', next: 'Legend', nextSec: 240, color: '#A0A0A0', pop: '1%' };
  if (sec >= 120) return { tier: 'Expert', next: 'Elite', nextSec: 180, color: '#cc0000', pop: '5%' };
  if (sec >= 60) return { tier: 'Contender', next: 'Expert', nextSec: 120, color: '#666666', pop: '20%' };
  return { tier: 'Challenger', next: 'Contender', nextSec: 60, color: '#1E8449', pop: '75%' };
}

// === ATHLETE STATS (full) ===
async function getAthleteStats(tok, email, name) {
  const sub = await readSheet(tok, "'Custom Form Submissions'!A:ZZ");
  if (sub.length < 2) return null;
  const hdrs = sub[0].map(h => h.toString().trim());
  const eI = hdrs.indexOf('Email Address'), nI = hdrs.indexOf('Athlete Name'), tI = hdrs.indexOf('Official Time');
  const dobI = hdrs.indexOf('Date of Birth'), gI = hdrs.indexOf('Gender'), wI = hdrs.indexOf('Weight (lbs)');
  const hI = hdrs.indexOf('Height (inches)'), trI = hdrs.indexOf('Grip Training Experience');
  const dI = hdrs.indexOf('Attempt Date') >= 0 ? hdrs.indexOf('Attempt Date') : -1;
  const vI = hdrs.indexOf('Verified');

  const subs = [];
  const eL = email.toLowerCase().trim();
  for (let i = 1; i < sub.length; i++) {
    if ((sub[i][eI] || '').toString().toLowerCase().trim() === eL) subs.push(sub[i]);
  }
  if (!subs.length) return null;

  let bestSec = 0, latest = null, prev = 0;
  const hist = [];
  subs.forEach(row => {
    const s = parseTimeSec(row[tI]), v = vI >= 0 ? (row[vI] || '').toString().trim().toLowerCase() === 'yes' : false;
    const dd = dI >= 0 ? row[dI] : '';
    hist.push({ time: fmtTime(s), sec: s, date: dd, verified: v, isPR: s > prev });
    if (s > prev) prev = s;
    if (s > bestSec) { bestSec = s; }
    latest = row;
  });
  hist.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  // Rank
  const all = {};
  for (let i = 1; i < sub.length; i++) {
    const re = (sub[i][eI] || '').toString().trim().toLowerCase(), rn = (sub[i][nI] || '').toString().trim().toLowerCase();
    if (!re || !rn) continue;
    const k = `${re}|${rn}`, s = parseTimeSec(sub[i][tI]);
    if (!all[k] || s > all[k]) all[k] = s;
  }
  const sorted = Object.values(all).sort((a, b) => b - a);
  const rank = bestSec > 0 ? sorted.indexOf(bestSec) + 1 : '--';

  // Consistency
  const times = hist.map(h => h.sec).filter(t => t > 0);
  let consistency = null;
  if (times.length >= 2) {
    const mean = times.reduce((a, b) => a + b, 0) / times.length;
    const std = Math.sqrt(times.reduce((s, t) => s + (t - mean) ** 2, 0) / times.length);
    consistency = Math.max(0, Math.min(100, Math.round(100 - (std / mean) * 100)));
  }

  // Days since last
  const lastDate = hist[0]?.date || '';
  let daysSince = null;
  if (lastDate) { try { daysSince = Math.floor((Date.now() - new Date(lastDate).getTime()) / 864e5); } catch(e) {} }

  // Streak (submissions in last 30 days)
  const now = Date.now();
  const last30 = hist.filter(h => { try { return (now - new Date(h.date).getTime()) / 864e5 <= 30; } catch(e) { return false; } });
  const streak = last30.length;

  // PR streak (consecutive PRs in history)
  let prStreak = 0;
  const revHist = [...hist].reverse(); // oldest first
  let lastSec = 0;
  for (const h of revHist) {
    if (h.sec > lastSec) { prStreak++; lastSec = h.sec; } else break;
  }

  const dob = latest[dobI] || '', gender = latest[gI] || 'Male';
  const weight = latest[wI] || '', height = latest[hI] || '', training = latest[trI] || 'None';
  const gripAge = calcGripAge(dob, weight, gender, bestSec, height, training);

  let chrAge = '';
  if (dob) { try { const b = new Date(dob); if (!isNaN(b.getTime())) chrAge = Math.floor((Date.now() - b.getTime()) / (365.25 * 864e5)); } catch(e) {} }

  const tier = getTier(bestSec);

  return {
    name: latest[nI] || name || email.split('@')[0],
    displayName: (latest[nI] || name || 'Athlete').split(' ')[0],
    email, rank, bestHangTime: fmtTime(bestSec), bestHangSec: bestSec,
    totalSubmissions: subs.length, verifiedSubmissions: hist.filter(h => h.verified).length,
    gripAge, chronologicalAge: chrAge,
    yearsSaved: chrAge && gripAge !== '--' ? Math.round((chrAge - gripAge) * 10) / 10 : null,
    tier: tier.tier, tierColor: tier.color, tierPop: tier.pop,
    nextTier: tier.next, nextTierSec: tier.nextSec,
    nextTierGap: tier.nextSec > 0 ? fmtTime(tier.nextSec - bestSec) : null,
    history: hist, lastSubmissionDate: lastDate, daysSinceLastSubmission: daysSince,
    consistencyScore: consistency, monthlyStreak: streak, prStreak: prStreak,
    gripTraining: training, weight, height, gender, dob,
  };
}

// === GMAIL ===
async function sendEmail(tk, to, subject, html) {
  const mime = `To: ${to}\r\nFrom: support@worlddeadhang.com\r\nSubject: ${subject}\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n${html}`;
  let raw; try { raw = btoa(unescape(encodeURIComponent(mime))); } catch(e) { raw = btoa(mime); }
  raw = raw.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    { method: 'POST', headers: { 'Authorization': `Bearer ${tk}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ raw }) });
  return r.ok;
}

// === TOKENS ===
function genToken() { const c = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; let r = ''; const a = new Uint8Array(32); crypto.getRandomValues(a); for (let i = 0; i < 32; i++) r += c[a[i] % c.length]; return r; }
function genSession() { return genToken() + genToken(); }

// === CORS ===
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
function jsonResp(d, s = 200) { return new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json', ...CORS } }); }

// === EMAIL BUILDERS ===
function dashboardSubmitEmail(name, time, gripAge) {
  const fn = name.split(' ')[0];
  return `<div style="background:#000;padding:40px 20px;font-family:sans-serif;">
    <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;border:1px solid #D4AF37;">
      <div style="background:#000;padding:30px;text-align:center;">
        <h1 style="color:#fff;letter-spacing:2px;">WORLD DEAD HANG</h1><p style="color:#D4AF37;font-weight:bold;">CHAMPIONSHIP</p>
      </div>
      <div style="padding:40px 30px;">
        <h2>Nice work, ${fn}.</h2>
        <p style="font-size:16px;">Your hang of <strong>${time}</strong> has been submitted and is under review.</p>
        <div style="background:#000;color:#fff;padding:25px;border-radius:8px;text-align:center;margin:25px 0;">
          <h3 style="color:#D4AF37;font-size:28px;margin:0;">GripAge™: ${gripAge}</h3>
        </div>
        <p>You'll receive another email once verified.</p>
        <br><p><strong>Milo</strong><br>Founder, WDHC</p>
      </div>
    </div></div>`;
}

function approvalEmail(name, time, totalSec, verifyUrl, gripAge) {
  const fn = name.split(' ')[0], t = getTier(totalSec);
  const badge = `<span style="display:inline-block;padding:4px 12px;background:${t.color};color:${t.color === '#D4AF37' || t.color === '#E0E0E0' ? '#000' : '#fff'};font-weight:bold;border-radius:4px;">${t.tier}</span>`;
  return `<div style="background:#000;padding:40px 20px;font-family:sans-serif;">
    <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;border:1px solid #D4AF37;">
      <div style="background:#000;padding:30px;text-align:center;">
        <h1 style="color:#fff;letter-spacing:2px;">WORLD DEAD HANG</h1><p style="color:#D4AF37;font-weight:bold;">CHAMPIONSHIP</p>
      </div>
      <div style="padding:40px 30px;">
        <h2>Verified, ${fn}!</h2>
        <p style="font-size:16px;">Your time is confirmed and you're on the <a href="https://worlddeadhang.com">global leaderboard</a>.</p>
        <div style="background:#f9f9f9;padding:25px;margin:25px 0;text-align:center;border-radius:6px;">
          <p style="margin:0;color:#888;font-size:12px;text-transform:uppercase;">Official Time</p>
          <h1 style="margin:5px 0;font-size:48px;">${time}</h1>
          <div>${badge}</div>
        </div>
        <div style="background:#000;color:#fff;padding:25px;border-radius:8px;text-align:center;margin:20px 0;">
          <h3 style="color:#D4AF37;font-size:24px;margin:0;">GripAge™: ${gripAge}</h3>
        </div>
        ${t.next ? `<p>You're <strong>${fmtTime(t.nextSec - totalSec)}</strong> away from <strong>${t.next}</strong> tier.</p>` : '<p>You\'re at the peak. Freak tier.</p>'}
        <div style="text-align:center;margin:25px 0;">
          <a href="${verifyUrl}" style="background:#D4AF37;color:#000;padding:16px 32px;text-decoration:none;border-radius:4px;font-weight:bold;text-transform:uppercase;">View Your Dashboard</a>
        </div>
        <p style="font-size:14px;color:#666;">Share your result: <a href="https://worlddeadhang.com">worlddeadhang.com</a></p>
        <br><p><strong>Milo</strong><br>Founder, WDHC</p>
      </div>
    </div></div>`;
}

function notifyAdminEmail(name, time, email, ga) {
  const approveUrl = `${creds().PORTAL_URL || 'https://wdhc-portal.milobirk.workers.dev'}/api/admin/approve?email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}&key=${creds().ADMIN_KEY}`;
  const verifyApproveUrl = `${creds().PORTAL_URL || 'https://wdhc-portal.milobirk.workers.dev'}/api/admin/verify-approve?email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}&key=${creds().ADMIN_KEY}`;
  const denyUrl = `${creds().PORTAL_URL || 'https://wdhc-portal.milobirk.workers.dev'}/api/admin/deny?email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}&key=${creds().ADMIN_KEY}`;
  return `<div style="font-family:sans-serif;padding:20px;background:#1a1a1a;color:#fff;border-radius:8px;">
    <h2 style="color:#D4AF37;margin-top:0;">🏆 New Submission</h2>
    <p><strong style="color:#fff;">${name}</strong> (${email})</p>
    <p style="font-size:24px;color:#D4AF37;margin:15px 0;"><strong>${time}</strong></p>
    <p style="color:#aaa;">GripAge™: <strong style="color:#fff;">${ga || '--'}</strong></p>
    <div style="margin:25px 0;display:flex;gap:10px;flex-wrap:wrap;">
      <a href="${approveUrl}" style="background:#1E8449;color:#fff;padding:12px 20px;text-decoration:none;border-radius:4px;font-weight:bold;">✅ Approve (Leaderboard)</a>
      <a href="${verifyApproveUrl}" style="background:#D4AF37;color:#000;padding:12px 20px;text-decoration:none;border-radius:4px;font-weight:bold;">⭐ Verify + Approve</a>
      <a href="${denyUrl}" style="background:#cc0000;color:#fff;padding:12px 20px;text-decoration:none;border-radius:4px;font-weight:bold;">❌ Deny</a>
    </div>
    <p style="color:#666;font-size:12px;"><a href="https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}" style="color:#888;">Review in Sheet</a></p>
  </div>`;
}

// === REDIRECT HTML ===
function redirectHtml(url) {
  return `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=${url}"></head><body style="background:#050505;color:#D4AF37;text-align:center;padding-top:20vh;font-family:sans-serif;"><h2>ENTERING...</h2><script>window.location.replace("${url}");</script></body></html>`;
}

// ===== APPROVAL + LEADERBOARD SYNC =====
async function syncLeaderboard(tok) {
  const sub = await readSheet(tok, "'Custom Form Submissions'!A:ZZ");
  if (sub.length < 2) return [];
  const hdrs = sub[0].map(h => h.toString().trim());
  const nI = hdrs.indexOf('Athlete Name'), eI = hdrs.indexOf('Email Address'), tI = hdrs.indexOf('Official Time');
  const rI = hdrs.indexOf('Reviewed'), vI = hdrs.indexOf('Verified');
  const revI = hdrs.indexOf('Approved');
  const dobI = hdrs.indexOf('Date of Birth'), gI = hdrs.indexOf('Gender');
  const wI = hdrs.indexOf('Weight (lbs)'), hI = hdrs.indexOf('Height (inches)');
  const trI = hdrs.indexOf('Grip Training Experience'), cI = hdrs.indexOf('Country');
  const tsI = hdrs.indexOf('Timestamp');

  const athletes = {};
  for (let i = 1; i < sub.length; i++) {
    const row = sub[i];
    // Sync approved athletes (verified = checkmark only, not required for leaderboard)
    const reviewed = (row[rI] || '').toString().trim().toLowerCase() === 'yes';
    const verified = (row[vI] || '').toString().trim().toLowerCase() === 'yes';
    const approved = (row[revI] || '').toString().trim().toLowerCase() === 'yes';
    if (!reviewed || !approved) continue;

    const name = (row[nI] || '').toString().trim();
    const email = (row[eI] || '').toString().trim().toLowerCase();
    if (!name) continue;
    const key = email ? `${email}|${name.toLowerCase()}` : name.toLowerCase();
    const timeS = parseTimeSec(row[tI]);
    if (!timeS) continue;

    if (!athletes[key] || timeS > athletes[key].bestSec) {
      athletes[key] = {
        name, email, bestSec: timeS, row,
        dob: row[dobI] || '', gender: row[gI] || 'Male',
        weight: row[wI] || '', height: row[hI] || '',
      training: row[trI] || 'None', country: row[cI] || '',
      timestamp: row[tsI] || '', verified: verified,
      };
    }
  }

  return Object.values(athletes).sort((a, b) => b.bestSec - a.bestSec);
}

// ===== MAIN ROUTER =====
export default {
  async fetch(request, env) {
    _env = env;
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    try { return await handleRequest(request); }
    catch (e) { return jsonResp({ success: false, error: e.message }, 500); }
  }
};

async function handleRequest(req) {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\//, '').replace(/^\//, '');
  const token = url.searchParams.get('token') || '';
  const email = url.searchParams.get('email') || '';
  const name = url.searchParams.get('name') || '';

  // --- AUTH: magic link ---
  if (path === 'auth/magic-link' || path === 'magic-link') return handleMagicLink(req, email, name);

  // --- AUTH: verify ---
  if (path === 'auth/verify' || path === 'verify') return handleVerify(token);

  // --- ATHLETE: profile ---
  if (path === 'athlete/profile' || path === 'profile') return handleGetProfile(token);

  // --- ATHLETE: history ---
  if (path === 'athlete/history' || path === 'history') return handleGetHistory(token);

  // --- ATHLETE: submit hang ---
  if (path === 'athlete/submit-hang' || path === 'submit-hang') return handleSubmitHang(req, token);

  // --- ATHLETE: update profile ---
  if (path === 'athlete/update-profile' || path === 'update-profile') return handleUpdateProfile(req, token);

// --- ADMIN: approve ---
  if (path === 'admin/approve' || path === 'approve') return handleApprove(req, url.searchParams);

  // --- ADMIN: verify + approve ---
  if (path === 'admin/verify-approve' || path === 'verify-approve') return handleVerifyApprove(req, url.searchParams);

  // --- ADMIN: deny ---
  if (path === 'admin/deny' || path === 'deny') return handleDeny(req, url.searchParams);

  // --- ADMIN: sync ---
  if (path === 'admin/sync' || path === 'sync') return handleSync(req);

  // --- SHARE: social card data ---
  if (path === 'share/card' || path === 'share') return handleShareCard(token);

  return jsonResp({ status: 'OK', v: 'portal-2.1' });
}

// ===== HANDLERS =====

async function handleMagicLink(req, email, name) {
  let em = email, nm = name;
  if (!em && req.method === 'POST') { try { const b = await req.json(); em = b.email || ''; nm = b.athleteName || ''; } catch(e) {} } if (!em) return jsonResp({ success: false, error: 'Email required' }, 400);
  const tok = await getAccessToken();
  const sub = await readSheet(tok, "'Custom Form Submissions'!A:ZZ");
  if (sub.length < 2) return jsonResp({ success: false, error: 'No data' }, 404);
  const hdrs = sub[0].map(h => h.toString().trim());
  const eI = hdrs.indexOf('Email Address'), nI = hdrs.indexOf('Athlete Name'), tI = hdrs.indexOf('Official Time');
  let latest = null;
  for (let i = sub.length - 1; i >= 1; i--) {
    if ((sub[i][eI] || '').toString().toLowerCase().trim() === em.toLowerCase().trim()) { latest = sub[i]; break; }
  }
  if (!latest) return jsonResp({ success: false, error: 'Not found' }, 404);

  const aName = latest[nI] || nm || em.split('@')[0];
  const timeStr = latest[tI] || '0:00', totalSec = parseTimeSec(timeStr);
  const mToken = genToken(), expiry = new Date(Date.now() + 864e5).toISOString();
  await appendRow(tok, 'MagicLinks!A:G', [em.toLowerCase(), mToken, expiry, 'FALSE', aName, 'FALSE', new Date().toISOString()]);

  const workerUrl = new URL(req.url).origin;
  const verifyUrl = `${workerUrl}/api/auth/verify?token=${mToken}`;
  const gripAge = calcGripAge(latest[hdrs.indexOf('Date of Birth')] || '', latest[hdrs.indexOf('Weight (lbs)')] || '',
    latest[hdrs.indexOf('Gender')] || 'Male', totalSec, latest[hdrs.indexOf('Height (inches)')] || '',
    latest[hdrs.indexOf('Grip Training Experience')] || 'None');
  const subject = '🔥 Your WDHC Athlete Portal Access Link';
  await sendEmail(tok, em, subject, approvalEmail(aName, timeStr, totalSec, verifyUrl, gripAge));
  return jsonResp({ success: true, message: `Sent to ${em}` });
}

async function handleVerify(token) {
  if (!token) return new Response('<h2>Invalid</h2>', { status: 400, headers: { 'Content-Type': 'text/html' } });
  const tok = await getAccessToken();
  const ml = await readSheet(tok, 'MagicLinks!A:G');
  if (ml.length < 2) return new Response('<h2>Invalid</h2>', { status: 404, headers: { 'Content-Type': 'text/html' } });
  const h = ml[0], tI = h.indexOf('token'), eI = h.indexOf('email'), nI = h.indexOf('athleteName');
  let link = null, row = -1;
  for (let i = 1; i < ml.length; i++) { if (ml[i][tI] === token) { link = ml[i]; row = i + 1; break; } }
  if (!link) return new Response('<h2>Expired</h2>', { status: 404, headers: { 'Content-Type': 'text/html' } });

  const lnkEmail = link[eI].toString().toLowerCase(), lnkName = (link[nI] || '').toString();
  const sToken = genSession();
  await appendRow(tok, 'Sessions!A:E', [genToken(), lnkEmail, sToken, new Date().toISOString(), new Date(Date.now() + 2592e6).toISOString()]);
  try { await updateCell(tok, `MagicLinks!F${row}`, 'TRUE'); } catch(e) {}

  const stats = await getAthleteStats(tok, lnkEmail, lnkName);
  const statsEnc = stats ? encodeURIComponent(JSON.stringify(stats)) : '';
  const redirectUrl = `${DASHBOARD_URL}?session=${sToken}${statsEnc ? '&p=' + statsEnc : ''}`;
  return new Response(redirectHtml(redirectUrl), { headers: { 'Content-Type': 'text/html', 'Location': redirectUrl } });
}

async function handleGetProfile(token) {
  if (!token) return jsonResp({ success: false, error: 'No session' }, 401);
  const tok = await getAccessToken();
  const s = await readSheet(tok, 'Sessions!A:E');
  if (s.length < 2) return jsonResp({ success: false, error: 'No session' }, 401);
  const h = s[0].map(x => x.toString().trim()), tI = h.indexOf('token'), eI = h.indexOf('athleteId');
  let em = null;
  for (let i = 1; i < s.length; i++) { if (s[i][tI]?.toString() === token) { em = s[i][eI]?.toString(); break; } }
  if (!em) return jsonResp({ success: false, error: 'Unauthorized' }, 401);
  const stats = await getAthleteStats(tok, em, '');
  if (!stats) return jsonResp({ success: false, error: 'Not found' }, 404);
  return jsonResp({ success: true, data: stats });
}

async function handleGetHistory(token) {
  if (!token) return jsonResp({ success: false, error: 'No session' }, 401);
  const tok = await getAccessToken();
  const s = await readSheet(tok, 'Sessions!A:E');
  if (s.length < 2) return jsonResp({ success: false, error: 'No session' }, 401);
  const h = s[0].map(x => x.toString().trim()), tI = h.indexOf('token'), eI = h.indexOf('athleteId');
  let em = null;
  for (let i = 1; i < s.length; i++) { if (s[i][tI]?.toString() === token) { em = s[i][eI]?.toString(); break; } }
  if (!em) return jsonResp({ success: false, error: 'Unauthorized' }, 401);
  const stats = await getAthleteStats(tok, em, '');
  if (!stats) return jsonResp({ success: false, error: 'No data' }, 404);
  return jsonResp({ success: true, data: { history: stats.history, totalSubmissions: stats.totalSubmissions, bestHangTime: stats.bestHangTime, gripAge: stats.gripAge, tier: stats.tier } });
}

async function handleSubmitHang(req, token) {
  if (req.method !== 'POST') return jsonResp({ success: false, error: 'Method not allowed' }, 405);
  if (!token) return jsonResp({ success: false, error: 'No session' }, 401);
  let body; try { body = await req.json(); } catch(e) { return jsonResp({ success: false, error: 'Invalid' }, 400); }
  const { hangTime, videoUrl, attemptDate, notes } = body;
  if (!hangTime) return jsonResp({ success: false, error: 'Time required' }, 400);

  const tok = await getAccessToken();
  const s = await readSheet(tok, 'Sessions!A:E');
  if (s.length < 2) return jsonResp({ success: false, error: 'No session' }, 401);
  const h = s[0].map(x => x.toString().trim()), tI = h.indexOf('token'), eI = h.indexOf('athleteId');
  let em = null;
  for (let i = 1; i < s.length; i++) { if (s[i][tI]?.toString() === token) { em = s[i][eI]?.toString(); break; } }
  if (!em) return jsonResp({ success: false, error: 'Unauthorized' }, 401);

  const sub = await readSheet(tok, "'Custom Form Submissions'!A:ZZ");
  if (sub.length < 2) return jsonResp({ success: false, error: 'No data' }, 404);
  const hdrs = sub[0].map(x => x.toString().trim()), eI2 = hdrs.indexOf('Email Address'), nI = hdrs.indexOf('Athlete Name');
  let latest = null;
  for (let i = sub.length - 1; i >= 1; i--) { if ((sub[i][eI2] || '').toString().toLowerCase().trim() === em) { latest = sub[i]; break; } }
  if (!latest) return jsonResp({ success: false, error: 'No profile' }, 404);

  // Build row using existing profile data
  const subId = 'SUB-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  const row = [
    new Date().toISOString(), subId,
    latest[nI] || '', (latest[hdrs.indexOf('First Name')] || latest[nI] || '').split(' ')[0] || '',
    (latest[hdrs.indexOf('Last Name')] || '').split(' ').pop() || '',
    em,
    latest[hdrs.indexOf('City, State')] || '', latest[hdrs.indexOf('Country')] || '',
    latest[hdrs.indexOf('Date of Birth')] || '', latest[hdrs.indexOf('Gender')] || 'Male',
    latest[hdrs.indexOf('Weight (lbs)')] || '', latest[hdrs.indexOf('Height (inches)')] || '',
    latest[hdrs.indexOf('Grip Training Experience')] || 'None',
    attemptDate || new Date().toISOString().split('T')[0], hangTime,
    videoUrl || '', notes || '', latest[hdrs.indexOf('How did you hear about us?')] || '',
    'Yes', 'No', 'Pending', 'No', '', '', '', latest[hdrs.indexOf('Occupation')] || '',
  ];
  while (row.length < 27) row.push('');

  const sheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/'Custom Form Submissions'!A:AA:append?valueInputOption=USER_ENTERED`;
  const sr = await fetch(sheetUrl, { method: 'POST', headers: { 'Authorization': `Bearer ${tok}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ values: [row] }) });
  if (!sr.ok) return jsonResp({ success: false, error: 'Save failed' }, 500);

  const totalSec = parseTimeSec(hangTime);
  const gripAge = calcGripAge(latest[hdrs.indexOf('Date of Birth')] || '', latest[hdrs.indexOf('Weight (lbs)')] || '',
    latest[hdrs.indexOf('Gender')] || 'Male', totalSec, latest[hdrs.indexOf('Height (inches)')] || '',
    latest[hdrs.indexOf('Grip Training Experience')] || 'None');

  // 1. Confirmation email to athlete
  const aName = latest[nI] || em.split('@')[0];
  try { await sendEmail(tok, em, `Your WDHC Submission — ${fmtTime(totalSec)}`, dashboardSubmitEmail(aName, fmtTime(totalSec), gripAge)); } catch(e) { console.error('Athlete email:', e); }

  // 2. Admin notification
  try {
    await sendEmail(tok, 'milobirk@gmail.com', `📬 ${aName} — ${fmtTime(totalSec)}`, notifyAdminEmail(aName, fmtTime(totalSec), em, gripAge));
  } catch(e) { console.error('Admin notify:', e); }

  // 3. Auto-sync to leaderboard (pending section)
  try {
    const approved = await syncLeaderboard(tok);
    // Write inline JSON to _public/index.html for Cloudflare Pages
    const athleteJSON = JSON.stringify(approved.map(a => ({
      name: a.name, time: fmtTime(a.bestSec), gripAge: calcGripAge(a.dob, a.weight, a.gender, a.bestSec, a.height, a.training),
      tier: getTier(a.bestSec).tier, country: a.country || '', verified: a.verified,
    })));
    const marker = 'const pendingAthletes = [';
    const newBlock = `${marker}\n${athleteJSON.replace(/^\[/, '').replace(/\]$/, '')}];`;
    await updateCell(tok, "'Pending Leaderboard'!A1", newBlock);
  } catch(e) { console.error('Sync:', e); }

  return jsonResp({ success: true, message: 'Submitted!', hangTime: fmtTime(totalSec), gripAge });
}

async function handleUpdateProfile(req, token) {
  if (req.method !== 'POST') return jsonResp({ success: false, error: 'Method not allowed' }, 405);
  if (!token) return jsonResp({ success: false, error: 'No session' }, 401);
  let body; try { body = await req.json(); } catch(e) { return jsonResp({ success: false, error: 'Invalid' }, 400); }
  const { weight, height, gripTraining } = body;

  const tok = await getAccessToken();
  const s = await readSheet(tok, 'Sessions!A:E');
  if (s.length < 2) return jsonResp({ success: false, error: 'No session' }, 401);
  const h = s[0].map(x => x.toString().trim()), tI = h.indexOf('token'), eI = h.indexOf('athleteId');
  let em = null;
  for (let i = 1; i < s.length; i++) { if (s[i][tI]?.toString() === token) { em = s[i][eI]?.toString(); break; } }
  if (!em) return jsonResp({ success: false, error: 'Unauthorized' }, 401);

  // Update latest submission row with new profile data
  const sub = await readSheet(tok, "'Custom Form Submissions'!A:ZZ");
  if (sub.length >= 2) {
    const hdrs = sub[0].map(x => x.toString().trim());
    const eI2 = hdrs.indexOf('Email Address'), nI = hdrs.indexOf('Athlete Name');
    // Update the most recent row for this athlete
    for (let i = sub.length - 1; i >= 1; i--) {
      if ((sub[i][eI2] || '').toString().toLowerCase().trim() === em) {
        const row = [...sub[i]];
        const wI = hdrs.indexOf('Weight (lbs)'), hI = hdrs.indexOf('Height (inches)'), trI = hdrs.indexOf('Grip Training Experience');
        if (weight && wI >= 0) row[wI] = String(weight);
        if (height && hI >= 0) row[hI] = String(height);
        if (gripTraining && trI >= 0) row[trI] = String(gripTraining);
        await updateCell(tok, `'Custom Form Submissions'!A${i + 1}:AA${i + 1}`, 'SKIP'); // mark updated
        // Write full row
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/'Custom Form Submissions'!A${i + 1}:AA${i + 1}?valueInputOption=USER_ENTERED`,
          { method: 'PUT', headers: { 'Authorization': `Bearer ${tok}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ values: [row] }) });
        break;
      }
    }
  }

  // Clear cache so profile refreshes
  localStorage.removeItem('wdhc_athlete_data');

  return jsonResp({ success: true, message: 'Profile updated' });
}

async function handleApprove(req, params) {
  if (req.method !== 'POST') return jsonResp({ success: false, error: 'Method not allowed' }, 405);
  const athleteEmail = params.get('email') || '';
  const athleteName = params.get('name') || '';
  const adminKey = params.get('key') || '';

  // Simple admin auth — use a secret key
  if (adminKey !== creds().ADMIN_KEY) return jsonResp({ success: false, error: 'Unauthorized' }, 401);

  const tok = await getAccessToken();
  const sub = await readSheet(tok, "'Custom Form Submissions'!A:ZZ");
  if (sub.length < 2) return jsonResp({ success: false, error: 'No data' }, 404);
  const hdrs = sub[0].map(h => h.toString().trim());
  const eI = hdrs.indexOf('Email Address'), nI = hdrs.indexOf('Athlete Name');
  const rI = hdrs.indexOf('Reviewed'), vI = hdrs.indexOf('Verified'), aI = hdrs.indexOf('Approved');
  const tI = hdrs.indexOf('Official Time');

  // Find the latest submission for this athlete
  let targetRow = -1;
  for (let i = sub.length - 1; i >= 1; i--) {
    const re = (sub[i][eI] || '').toString().toLowerCase().trim();
    const rn = (sub[i][nI] || '').toString().toLowerCase().trim();
    if (re === athleteEmail.toLowerCase() && (!athleteName || rn === athleteName.toLowerCase())) {
      targetRow = i + 1; break;
    }
  }
  if (targetRow === -1) return jsonResp({ success: false, error: 'Athlete not found' }, 404);

  // Set Reviewed=Yes, Approved=Yes (Verified is separate — checkmark only)
  const col = n => String.fromCharCode(65 + n) + targetRow;
  await updateCell(tok, `'Custom Form Submissions'!${col(rI)}`, 'Yes');
  await updateCell(tok, `'Custom Form Submissions'!${col(aI)}`, 'Yes');
  // Note: Verified is NOT set here — that's a separate action for checkmark display

  // Get the time
const timeStr = sub[targetRow - 1][tI] || '0:00';
  const totalSec = parseTimeSec(timeStr);
  const gripAge = calcGripAge(sub[targetRow-1][hdrs.indexOf('Date of Birth')]||'',sub[targetRow-1][hdrs.indexOf('Weight (lbs)')]||'',sub[targetRow-1][hdrs.indexOf('Gender')]||'Male',totalSec,sub[targetRow-1][hdrs.indexOf('Height (inches)')]||'',sub[targetRow-1][hdrs.indexOf('Grip Training Experience')]||'None');

  // Sync leaderboard
  try {
    const approved = await syncLeaderboard(tok);
    const athleteJSON = JSON.stringify(approved.map(a => ({
      name: a.name, time: fmtTime(a.bestSec),
      gripAge: calcGripAge(a.dob, a.weight, a.gender, a.bestSec, a.height, a.training),
      tier: getTier(a.bestSec).tier, country: a.country || '', verified: a.verified,
    })));
    const newBlock = `const athletes = [\n${athleteJSON.replace(/^\[/, '').replace(/\]$/, '')}];`;
    // Write to a dedicated cell that get_inline_athletes.js reads
    await updateCell(tok, "'Leaderboard Cache'!A1", newBlock);
  } catch(e) { console.error('Leaderboard sync:', e); }

  // Send approval email with one-click portal link
  const aName = sub[targetRow - 1][nI] || athleteName || athleteEmail.split('@')[0];
  const workerUrl = creds().PORTAL_URL || 'https://wdhc-portal.milobirk.workers.dev';
  const verifyUrl = `${workerUrl}/api/auth/magic-link?email=${encodeURIComponent(athleteEmail)}`;
  try {
    await sendEmail(tok, athleteEmail, `You're Approved! — ${timeStr}`,
      approvalEmail(aName, timeStr, totalSec, verifyUrl, gripAge));
  } catch(e) { console.error('Approval email:', e); }

  return jsonResp({ success: true, message: `Approved ${aName}`, time: timeStr, leaderboardSynced: true });
}

async function handleVerifyApprove(req, params) {
  if (req.method !== 'POST') return jsonResp({ success: false, error: 'Method not allowed' }, 405);
  const athleteEmail = params.get('email') || '';
  const athleteName = params.get('name') || '';
  const adminKey = params.get('key') || '';
  if (adminKey !== creds().ADMIN_KEY) return jsonResp({ success: false, error: 'Unauthorized' }, 401);

  const tok = await getAccessToken();
  const sub = await readSheet(tok, "'Custom Form Submissions'!A:ZZ");
  if (sub.length < 2) return jsonResp({ success: false, error: 'No data' }, 404);
  const hdrs = sub[0].map(h => h.toString().trim());
  const eI = hdrs.indexOf('Email Address'), nI = hdrs.indexOf('Athlete Name');
  const rI = hdrs.indexOf('Reviewed'), vI = hdrs.indexOf('Verified'), aI = hdrs.indexOf('Approved');
  const tI = hdrs.indexOf('Official Time');

  let targetRow = -1;
  for (let i = sub.length - 1; i >= 1; i--) {
    const re = (sub[i][eI] || '').toString().toLowerCase().trim();
    const rn = (sub[i][nI] || '').toString().toLowerCase().trim();
    if (re === athleteEmail.toLowerCase() && (!athleteName || rn === athleteName.toLowerCase())) { targetRow = i + 1; break; }
  }
  if (targetRow === -1) return jsonResp({ success: false, error: 'Athlete not found' }, 404);

  const col = n => String.fromCharCode(65 + n) + targetRow;
  await updateCell(tok, `'Custom Form Submissions'!${col(rI)}`, 'Yes');
  await updateCell(tok, `'Custom Form Submissions'!${col(vI)}`, 'Yes');
  await updateCell(tok, `'Custom Form Submissions'!${col(aI)}`, 'Yes');

const timeStr = sub[targetRow - 1][tI] || '0:00';
  const totalSec = parseTimeSec(timeStr);
  const gripAge = calcGripAge(sub[targetRow-1][hdrs.indexOf('Date of Birth')]||'',sub[targetRow-1][hdrs.indexOf('Weight (lbs)')]||'',sub[targetRow-1][hdrs.indexOf('Gender')]||'Male',totalSec,sub[targetRow-1][hdrs.indexOf('Height (inches)')]||'',sub[targetRow-1][hdrs.indexOf('Grip Training Experience')]||'None');

  try {
    const approved = await syncLeaderboard(tok);
    const athleteJSON = JSON.stringify(approved.map(a => ({
      name: a.name, time: fmtTime(a.bestSec),
      gripAge: calcGripAge(a.dob, a.weight, a.gender, a.bestSec, a.height, a.training),
      tier: getTier(a.bestSec).tier, country: a.country || '', verified: a.verified,
    })));
    const newBlock = `const athletes = [\n${athleteJSON.replace(/^\[/, '').replace(/\]$/, '')}];`;
    await updateCell(tok, "'Leaderboard Cache'!A1", newBlock);
  } catch(e) { console.error('Sync:', e); }

  const aName = sub[targetRow - 1][nI] || athleteName || athleteEmail.split('@')[0];
  const workerUrl = creds().PORTAL_URL || 'https://wdhc-portal.milobirk.workers.dev';
  const verifyUrl = `${workerUrl}/api/auth/magic-link?email=${encodeURIComponent(athleteEmail)}`;
  const ga = calcGripAge(sub[targetRow-1][hdrs.indexOf('Date of Birth')]||'',sub[targetRow-1][hdrs.indexOf('Weight (lbs)')]||'',sub[targetRow-1][hdrs.indexOf('Gender')]||'Male',totalSec,sub[targetRow-1][hdrs.indexOf('Height (inches)')]||'',sub[targetRow-1][hdrs.indexOf('Grip Training Experience')]||'None');
  try { await sendEmail(tok, athleteEmail, `You're Verified! \u2705 \u2014 ${timeStr}`, approvalEmail(aName, timeStr, totalSec, verifyUrl, ga)); } catch(e) {}

  return jsonResp({ success: true, message: `Verified + Approved ${aName}` });
}

async function handleDeny(req, params) {
  if (req.method !== 'POST') return jsonResp({ success: false, error: 'Method not allowed' }, 405);
  const athleteEmail = params.get('email') || '';
  const athleteName = params.get('name') || '';
  const adminKey = params.get('key') || '';
  if (adminKey !== creds().ADMIN_KEY) return jsonResp({ success: false, error: 'Unauthorized' }, 401);

  const tok = await getAccessToken();
  const sub = await readSheet(tok, "'Custom Form Submissions'!A:ZZ");
  if (sub.length < 2) return jsonResp({ success: false, error: 'No data' }, 404);
  const hdrs = sub[0].map(h => h.toString().trim());
  const eI = hdrs.indexOf('Email Address'), nI = hdrs.indexOf('Athlete Name');
  const rI = hdrs.indexOf('Reviewed'), aI = hdrs.indexOf('Approved');

  let targetRow = -1;
  for (let i = sub.length - 1; i >= 1; i--) {
    const re = (sub[i][eI] || '').toString().toLowerCase().trim();
    const rn = (sub[i][nI] || '').toString().toLowerCase().trim();
    if (re === athleteEmail.toLowerCase() && (!athleteName || rn === athleteName.toLowerCase())) { targetRow = i + 1; break; }
  }
  if (targetRow === -1) return jsonResp({ success: false, error: 'Athlete not found' }, 404);

  const col = n => String.fromCharCode(65 + n) + targetRow;
  await updateCell(tok, `'Custom Form Submissions'!${col(rI)}`, 'Yes');
  await updateCell(tok, `'Custom Form Submissions'!${col(aI)}`, 'No');

  const aName = sub[targetRow - 1][nI] || athleteName || athleteEmail.split('@')[0];
  try { await sendEmail(tok, athleteEmail, 'WDHC Submission Update', denyEmail(aName)); } catch(e) {}

  return jsonResp({ success: true, message: `Denied ${aName}` });
}

function denyEmail(name) {
  const fn = name.split(' ')[0];
  return `<div style="background:#000;padding:40px 20px;font-family:sans-serif;">
    <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;border:1px solid #cc0000;">
      <div style="background:#000;padding:30px;text-align:center;">
        <h1 style="color:#fff;letter-spacing:2px;">WORLD DEAD HANG</h1><p style="color:#D4AF37;font-weight:bold;">CHAMPIONSHIP</p>
      </div>
      <div style="padding:40px 30px;">
        <h2>Hi ${fn},</h2>
        <p style="font-size:16px;">Thanks for submitting your dead hang. Unfortunately, we weren't able to verify this submission.</p>
        <p style="color:#666;">This could be due to:</p>
        <ul style="color:#666;line-height:1.8;">
          <li>Video quality or visibility issues</li>
          <li>Form requirements not met (full dead hang, no kipping)</li>
          <li>Incomplete submission information</li>
        </ul>
        <p style="font-size:16px;">You're welcome to submit again with a clearer video and complete form. We want you on the board.</p>
        <div style="text-align:center;margin:25px 0;">
          <a href="https://worlddeadhang.com" style="background:#D4AF37;color:#000;padding:16px 32px;text-decoration:none;border-radius:4px;font-weight:bold;">Submit Again</a>
        </div>
        <p style="color:#888;font-size:13px;">Questions? Reply to this email.</p>
        <br><p><strong>Milo</strong><br>Founder, WDHC</p>
      </div>
    </div></div>`;
}

async function handleSync(req) {
  const adminKey = new URL(req.url).searchParams.get('key') || '';
  if (adminKey !== creds().ADMIN_KEY) return jsonResp({ success: false, error: 'Unauthorized' }, 401);
  const tok = await getAccessToken();
  const approved = await syncLeaderboard(tok);
  return jsonResp({ success: true, count: approved.length, athletes: approved.map(a => a.name) });
}

async function handleShareCard(token) {
  if (!token) return jsonResp({ success: false, error: 'No session' }, 401);
  const tok = await getAccessToken();
  const s = await readSheet(tok, 'Sessions!A:E');
  if (s.length < 2) return jsonResp({ success: false, error: 'No session' }, 401);
  const h = s[0].map(x => x.toString().trim()), tI = h.indexOf('token'), eI = h.indexOf('athleteId');
  let em = null;
  for (let i = 1; i < s.length; i++) { if (s[i][tI]?.toString() === token) { em = s[i][eI]?.toString(); break; } }
  if (!em) return jsonResp({ success: false, error: 'Unauthorized' }, 401);
  const stats = await getAthleteStats(tok, em, '');
  if (!stats) return jsonResp({ success: false, error: 'No data' }, 404);

  // Return data for social card generation
  return jsonResp({
    success: true,
    data: {
      name: stats.displayName,
      gripAge: stats.gripAge,
      tier: stats.tier,
      tierColor: stats.tierColor,
      bestHang: stats.bestHangTime,
      yearsSaved: stats.yearsSaved,
      rank: stats.rank,
      shareUrl: `https://worlddeadhang.com`,
      // Pre-built share text
      shareText: stats.yearsSaved > 0
        ? `My GripAge™ is ${stats.gripAge} — ${stats.yearsSaved} years younger than my actual age. ${stats.tier} Tier. 🏆`
        : `My GripAge™ is ${stats.gripAge}. ${stats.tier} Tier. Can you beat me? 💪`,
    }
  });
}
