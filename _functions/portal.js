import { calcGripAge, getTier, parseTimeSec, fmtTime } from './lib.js';

// WDHC Athlete Portal API — Cloudflare Worker v2.2
// Full backend: auth, profile, PR submission, approval, leaderboard sync, social cards

let _env = null;
function creds() { if (!_env) throw new Error('Env not init'); return _env; }

const SPREADSHEET_ID = '1qt-KNdOMareAl2Si6WRVAuTox7avV3gGAa7zdP6EW-s';
const DASHBOARD_URL = 'https://worlddeadhang.com/athlete-portal/dashboard.html';
const LEADERBOARD_URL = 'https://worlddeadhang.com/index.html';

// === SUPABASE ===
const SUPABASE_URL = 'https://lwqidqblxieoscnwqhvq.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3cWlkcWJseGllb3NjbndxaHZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTcyMDY3NCwiZXhwIjoyMDk1Mjk2Njc0fQ.7_kJvABVfgj8ItVy87kgH5D483xxuaIAh3MyDeQf5l8';

async function supabaseQuery(table, filter = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=*${filter}`;
  const r = await fetch(url, { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` } });
  return r.ok ? await r.json() : [];
}

async function supabaseInsert(table, data) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
    body: JSON.stringify(data)
  });
  return r.ok ? await r.json() : null;
}

async function supabaseUpdate(table, id, data) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return r.ok;
}

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

// === ATHLETE STATS (full) - Supabase version ===
async function getAthleteStatsSupabase(email, name) {
  // Get athlete by email
  const athletes = await supabaseQuery('athletes', `&email=eq.${encodeURIComponent(email)}`);
  if (!athletes.length) return null;
  const athlete = athletes[0];
  
  // Get all submissions for this athlete
  const submissions = await supabaseQuery('submissions', `&athlete_id=eq.${athlete.id}&order=time_seconds.desc`);
  if (!submissions.length) return null;
  
  const best = submissions[0];
  const bestSec = best.time_seconds;
  
  // Build history
  const hist = submissions.map(s => ({
    time: s.time_display,
    sec: s.time_seconds,
    date: s.attempt_date,
    verified: s.verified,
    isPR: s.is_pr
  }));
  hist.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  
  // Calculate rank across all athletes
  const allAthletes = await supabaseQuery('submissions', '&approved=eq.true&order=time_seconds.desc');
  const ranks = {};
  allAthletes.forEach(s => {
    const aid = s.athlete_id;
    if (!ranks[aid] || s.time_seconds > ranks[aid]) ranks[aid] = s.time_seconds;
  });
  const sorted = Object.values(ranks).sort((a, b) => b - a);
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
  
  // Streak
  const now = Date.now();
  const last30 = hist.filter(h => { try { return (now - new Date(h.date).getTime()) / 864e5 <= 30; } catch(e) { return false; } });
  const streak = last30.length;
  
  // PR streak
  let prStreak = 0;
  const revHist = [...hist].reverse();
  let lastSec = 0;
  for (const h of revHist) {
    if (h.sec > lastSec) { prStreak++; lastSec = h.sec; } else break;
  }
  
  const dob = athlete.dob || '', gender = athlete.gender || 'Male';
  const weight = athlete.bodyweight_lbs || '', height = athlete.height_inches || '', training = athlete.grip_training || 'None';
  const gripAge = calcGripAge(dob, weight, gender, bestSec, height, training);
  
  let chrAge = '';
  if (dob) { try { const b = new Date(dob); if (!isNaN(b.getTime())) chrAge = Math.floor((Date.now() - b.getTime()) / (365.25 * 864e5)); } catch(e) {} }
  
  const tier = getTier(bestSec);
  
  return {
    name: athlete.name || name || email.split('@')[0],
    displayName: (athlete.name || name || 'Athlete').split(' ')[0],
    email, rank, bestHangTime: fmtTime(bestSec), bestHangSec: bestSec,
    totalSubmissions: submissions.length, verifiedSubmissions: hist.filter(h => h.verified).length,
    gripAge, chronologicalAge: chrAge,
    yearsSaved: chrAge && gripAge !== '--' ? Math.round((chrAge - gripAge) * 10) / 10 : null,
    tier: tier.tier, tierColor: tier.color, tierPop: tier.pop,
    nextTier: tier.next, nextTierSec: tier.nextSec,
    nextTierGap: tier.nextSec > 0 ? fmtTime(tier.nextSec - bestSec) : null,
    history: hist, lastSubmissionDate: lastDate, daysSinceLastSubmission: daysSince,
    consistencyScore: consistency, monthlyStreak: streak, prStreak: prStreak,
    gripTraining: training, weight, height, gender, dob,
    source: 'supabase'
  };
}

// === ATHLETE STATS (full) - Sheets fallback ===
async function getAthleteStatsSheets(tok, email, name) {
  const sub = await readSheet(tok, "'Custom Form Submissions'!A:ZZ");
  if (sub.length < 2) return null;
  const hdrs = sub[0].map(h => h.toString().trim());
  const eI = hdrs.indexOf('Email Address'), nI = hdrs.indexOf('Athlete Name'), tI = hdrs.indexOf('Official Time');
  const dobI = hdrs.indexOf('Date of Birth'), gI = hdrs.indexOf('Gender');
  const wI = hdrs.indexOf('Bodyweight (lbs)') >= 0 ? hdrs.indexOf('Bodyweight (lbs)') : hdrs.indexOf('Weight (lbs)');
  const hI = hdrs.indexOf('Height') >= 0 ? hdrs.indexOf('Height') : hdrs.indexOf('Height (inches)');
  const trI = hdrs.indexOf('Grip Training Experience');
  const dI = hdrs.indexOf('Attempt Date') >= 0 ? hdrs.indexOf('Attempt Date') : -1;
  const vI = hdrs.indexOf('Verified');

  const subs = [];
  const eL = email.toLowerCase().trim();
  for (let i = 1; i < sub.length; i++) {
    if ((sub[i][eI] || '').toString().toLowerCase().trim() === eL) subs.push(sub[i]);
  }
  if (!subs.length) return null;

  let bestSec = 0, bestRow = null, latest = null, prev = 0;
  const hist = [];
  subs.forEach(row => {
    const s = parseTimeSec(row[tI]), v = vI >= 0 ? (row[vI] || '').toString().trim().toLowerCase() === 'yes' : false;
    const dd = dI >= 0 ? row[dI] : '';
    hist.push({ time: fmtTime(s), sec: s, date: dd, verified: v, isPR: s > prev });
    if (s > prev) prev = s;
    if (s > bestSec) { bestSec = s; bestRow = row; }
    latest = row;
  });
  // Use bestRow for profile details (name, DOB, weight, etc.), not last row
  const profileRow = bestRow || latest;
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

  const dob = profileRow[dobI] || '', gender = profileRow[gI] || 'Male';
  const weight = profileRow[wI] || '', height = profileRow[hI] || '', training = profileRow[trI] || 'None';
  const gripAge = calcGripAge(dob, weight, gender, bestSec, height, training);

  let chrAge = '';
  if (dob) { try { const b = new Date(dob); if (!isNaN(b.getTime())) chrAge = Math.floor((Date.now() - b.getTime()) / (365.25 * 864e5)); } catch(e) {} }

  const tier = getTier(bestSec);

  return {
    name: profileRow[nI] || name || email.split('@')[0],
    displayName: (profileRow[nI] || name || 'Athlete').split(' ')[0],
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

// === Unified getAthleteStats - tries Supabase first, falls back to Sheets ===
async function getAthleteStats(tok, email, name) {
  // Try Supabase first
  const supabaseResult = await getAthleteStatsSupabase(email, name);
  if (supabaseResult) return supabaseResult;
  
  // Fall back to Sheets
  return getAthleteStatsSheets(tok, email, name);
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
  const wI = hdrs.indexOf('Bodyweight (lbs)') >= 0 ? hdrs.indexOf('Bodyweight (lbs)') : hdrs.indexOf('Weight (lbs)');
  const hI = hdrs.indexOf('Height') >= 0 ? hdrs.indexOf('Height') : hdrs.indexOf('Height (inches)');
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

  return jsonResp({ status: 'OK', v: 'portal-2.2' });
}

// ===== HANDLERS =====

async function handleMagicLink(req, email, name) {
  let em = email, nm = name;
  if (!em && req.method === 'POST') { try { const b = await req.json(); em = b.email || ''; nm = b.athleteName || ''; } catch(e) {} }
  if (!em) return jsonResp({ success: false, error: 'Email required' }, 400);
  if (!em.includes('@') || em.length > 254) return jsonResp({ success: false, error: 'Invalid email' }, 400);

  // Find athlete in Supabase by email
  const athletes = await supabaseQuery('athletes', `&email=eq.${encodeURIComponent(em.toLowerCase())}`);
  if (!athletes.length) return jsonResp({ success: false, error: 'Not found' }, 404);
  const athlete = athletes[0];
  const aName = athlete.name || nm || em.split('@')[0];

  // Get best submission for this athlete
  const submissions = await supabaseQuery('submissions', `&athlete_id=eq.${athlete.id}&approved=eq.true&order=time_seconds.desc&limit=1`);
  let timeStr = '0:00', totalSec = 0;
  if (submissions.length) {
    timeStr = submissions[0].time_display;
    totalSec = submissions[0].time_seconds;
  }

  // Create magic link in Supabase
  const mToken = genToken();
  const expiry = new Date(Date.now() + 864e5).toISOString();
  await supabaseInsert('magic_links', {
    athlete_id: athlete.id,
    email: em.toLowerCase(),
    token: mToken,
    expires_at: expiry,
    used: false
  });

  // Calculate grip age from athlete profile
  const gripAge = calcGripAge(athlete.dob, athlete.bodyweight_lbs,
    athlete.gender, totalSec, athlete.height_inches,
    athlete.grip_training);

  // Send email (still uses Gmail API)
  const workerUrl = new URL(req.url).origin;
  const verifyUrl = `${workerUrl}/api/auth/verify?token=${mToken}`;
  const subject = '🔥 Your WDHC Athlete Portal Access Link';
  await sendEmail(await getAccessToken(), em, subject, approvalEmail(aName, timeStr, totalSec, verifyUrl, gripAge));
  return jsonResp({ success: true, message: `Sent to ${em}` });
}

async function handleVerify(token) {
  if (!token) return new Response('<h2>Invalid</h2>', { status: 400, headers: { 'Content-Type': 'text/html' } });
  
  // Query Supabase for magic link
  const links = await supabaseQuery('magic_links', `&token=eq.${token}&used=eq.false`);
  if (!links.length) return new Response('<h2>Expired</h2>', { status: 404, headers: { 'Content-Type': 'text/html' } });
  
  const link = links[0];
  const lnkEmail = link.email.toLowerCase();
  
  // Get athlete name from athletes table
  const athletes = await supabaseQuery('athletes', `&email=eq.${encodeURIComponent(lnkEmail)}`);
  const lnkName = athletes.length ? athletes[0].name : '';
  
  // Create session in Supabase
  const sToken = genSession();
  const expiresAt = new Date(Date.now() + 2592e6).toISOString(); // 30 days
  await supabaseInsert('sessions', {
    athlete_id: athletes.length ? athletes[0].id : null,
    session_token: sToken,
    created_at: new Date().toISOString(),
    expires_at: expiresAt
  });
  
  // Mark magic link as used
  await supabaseUpdate('magic_links', link.id, { used: true });

  const stats = await getAthleteStatsSupabase(lnkEmail, lnkName);
  const statsEnc = stats ? encodeURIComponent(JSON.stringify(stats)) : '';
  const redirectUrl = `${DASHBOARD_URL}?session=${sToken}${statsEnc ? '&p=' + statsEnc : ''}`;
  return new Response(redirectHtml(redirectUrl), { headers: { 'Content-Type': 'text/html', 'Location': redirectUrl } });
}

async function handleGetProfile(token) {
  if (!token) return jsonResp({ success: false, error: 'No session' }, 401);
  
  // Query Supabase for session
  const sessions = await supabaseQuery('sessions', `&session_token=eq.${token}`);
  if (!sessions.length) return jsonResp({ success: false, error: 'Unauthorized' }, 401);
  
  const session = sessions[0];
  
  // Get athlete by ID
  if (!session.athlete_id) return jsonResp({ success: false, error: 'No athlete' }, 400);
  const athletes = await supabaseQuery('athletes', `&id=eq.${session.athlete_id}`);
  if (!athletes.length) return jsonResp({ success: false, error: 'Not found' }, 404);
  
  const em = athletes[0].email;
  const stats = await getAthleteStatsSupabase(em, '');
  if (!stats) return jsonResp({ success: false, error: 'No data' }, 404);
  return jsonResp({ success: true, data: stats });
}

async function handleGetHistory(token) {
  if (!token) return jsonResp({ success: false, error: 'No session' }, 401);
  
  // Query Supabase for session
  const sessions = await supabaseQuery('sessions', `&session_token=eq.${token}`);
  if (!sessions.length) return jsonResp({ success: false, error: 'Unauthorized' }, 401);
  
  const session = sessions[0];
  
  // Get athlete by ID
  if (!session.athlete_id) return jsonResp({ success: false, error: 'No athlete' }, 400);
  const athletes = await supabaseQuery('athletes', `&id=eq.${session.athlete_id}`);
  if (!athletes.length) return jsonResp({ success: false, error: 'Not found' }, 404);
  
  const em = athletes[0].email;
  const stats = await getAthleteStatsSupabase(em, '');
  if (!stats) return jsonResp({ success: false, error: 'No data' }, 404);
  return jsonResp({ success: true, data: { history: stats.history, totalSubmissions: stats.totalSubmissions, bestHangTime: stats.bestHangTime, gripAge: stats.gripAge, tier: stats.tier } });
}

async function handleSubmitHang(req, token) {
  if (req.method !== 'POST') return jsonResp({ success: false, error: 'Method not allowed' }, 405);
  if (!token) return jsonResp({ success: false, error: 'No session' }, 401);
  let body; try { body = await req.json(); } catch(e) { return jsonResp({ success: false, error: 'Invalid' }, 400); }
  const { hangTime, videoUrl, attemptDate, notes } = body;
  if (!hangTime) return jsonResp({ success: false, error: 'Time required' }, 400);

  // Query Supabase for session
  const sessions = await supabaseQuery('sessions', `&session_token=eq.${token}`);
  if (!sessions.length) return jsonResp({ success: false, error: 'No session' }, 401);
  const session = sessions[0];
  if (!session.athlete_id) return jsonResp({ success: false, error: 'No athlete' }, 400);

  // Get athlete
  const athletes = await supabaseQuery('athletes', `&id=eq.${session.athlete_id}`);
  if (!athletes.length) return jsonResp({ success: false, error: 'No profile' }, 404);
  const athlete = athletes[0];

  // Build submission in Supabase
  const subId = 'SUB-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  const totalSec = parseTimeSec(hangTime);
  const gripAge = calcGripAge(athlete.dob, athlete.bodyweight_lbs,
    athlete.gender, totalSec, athlete.height_inches,
    athlete.grip_training);

  const submission = await supabaseInsert('submissions', {
    athlete_id: athlete.id,
    submission_id: subId,
    time_seconds: totalSec,
    time_display: fmtTime(totalSec),
    grip_age: gripAge,
    tier: getTier(totalSec).tier,
    attempt_date: attemptDate || new Date().toISOString().split('T')[0],
    video_url: videoUrl || null,
    notes: notes || '',
    is_pr: true,
    verified: false,
    approved: false,
    source: 'portal'
  });

  // 1. Confirmation email to athlete
  const aName = athlete.name || em.split('@')[0];
  try { await sendEmail(tok, em, `Your WDHC Submission — ${fmtTime(totalSec)}`, dashboardSubmitEmail(aName, fmtTime(totalSec), gripAge)); } catch(e) { console.error('Athlete email:', e); }

  // 2. Admin notification
  try {
    await sendEmail(tok, 'milobirk@gmail.com', `📬 ${aName} — ${fmtTime(totalSec)}`, notifyAdminEmail(aName, fmtTime(totalSec), em, gripAge));
  } catch(e) { console.error('Admin notify:', e); }

  // 3. Sync to leaderboard 
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

  // Query Supabase for session
  const sessions = await supabaseQuery('sessions', `&session_token=eq.${token}`);
  if (!sessions.length) return jsonResp({ success: false, error: 'No session' }, 401);
  const session = sessions[0];
  if (!session.athlete_id) return jsonResp({ success: false, error: 'No athlete' }, 400);

  // Update athlete in Supabase
  const updates = {};
  if (weight) updates.bodyweight_lbs = parseInt(weight);
  if (height) updates.height_inches = parseInt(height);
  if (gripTraining) updates.grip_training = gripTraining;

  await supabaseUpdate('athletes', session.athlete_id, updates);

  return jsonResp({ success: true, message: 'Profile updated' });
}

async function handleApprove(req, params) {
  // Accept GET (email links) and POST
  const athleteEmail = params.get('email') || '';
  const athleteName = params.get('name') || '';
  const adminKey = params.get('key') || '';

  // Simple admin auth — use a secret key
  if (adminKey !== creds().ADMIN_KEY) return jsonResp({ success: false, error: 'Unauthorized' }, 401);

  // Find athlete by email
  const athletes = await supabaseQuery('athletes', `&email=eq.${encodeURIComponent(athleteEmail)}`);
  if (!athletes.length) return jsonResp({ success: false, error: 'Athlete not found' }, 404);
  const athlete = athletes[0];

  // Find latest unapproved submission
  const subs = await supabaseQuery('submissions', `&athlete_id=eq.${athlete.id}&approved=eq.false&order=created_at.desc&limit=1`);
  if (!subs.length) return jsonResp({ success: false, error: 'No pending submission' }, 404);
  const sub = subs[0];

  // Approve the submission
  await supabaseUpdate('submissions', sub.id, { approved: true, reviewed: true });

  const timeStr = sub.time_display;
  const totalSec = sub.time_seconds;
  const gripAge = sub.grip_age || 0;

  // Sync leaderboard via Sheets (still needed for now)
  try {
    const tok = await getAccessToken();
    const approved = await syncLeaderboard(tok);
    const athleteJSON = JSON.stringify(approved.map(a => ({
      name: a.name, time: fmtTime(a.bestSec),
      gripAge: calcGripAge(a.dob, a.weight, a.gender, a.bestSec, a.height, a.training),
      tier: getTier(a.bestSec).tier, country: a.country || '', verified: a.verified,
    })));
    const newBlock = `const athletes = [\n${athleteJSON.replace(/^\[/, '').replace(/\]$/, '')}];`;
    await updateCell(tok, "'Leaderboard Cache'!A1", newBlock);
  } catch(e) { console.error('Leaderboard sync:', e); }

  // Send approval email with magic link
  const aName = athlete.name || athleteEmail.split('@')[0];
  const magicToken = genToken();
  const expiresAt = new Date(Date.now() + 86400000 * 30).toISOString();
  await supabaseInsert('magic_links', {
    athlete_id: athlete.id,
    email: athleteEmail,
    token: magicToken,
    expires_at: expiresAt,
    used: false
  });

  const workerUrl = creds().PORTAL_URL || 'https://wdhc-portal.milobirk.workers.dev';
  const verifyUrl = `${workerUrl}/api/auth/verify?token=${magicToken}`;
  try {
    const tok = await getAccessToken();
    await sendEmail(tok, athleteEmail, `You're Approved! — ${timeStr}`,
      approvalEmail(aName, timeStr, totalSec, verifyUrl, gripAge));
  } catch(e) { console.error('Approval email:', e); }

  return jsonResp({ success: true, message: `Approved ${aName}`, time: timeStr, leaderboardSynced: true });
}

async function handleVerifyApprove(req, params) {
  // Accept GET (email links) and POST
  const athleteEmail = params.get('email') || '';
  const athleteName = params.get('name') || '';
  const adminKey = params.get('key') || '';
  if (adminKey !== creds().ADMIN_KEY) return jsonResp({ success: false, error: 'Unauthorized' }, 401);

  // Find athlete by email
  const athletes = await supabaseQuery('athletes', `&email=eq.${encodeURIComponent(athleteEmail)}`);
  if (!athletes.length) return jsonResp({ success: false, error: 'Athlete not found' }, 404);
  const athlete = athletes[0];

  // Find latest unapproved submission
  const subs = await supabaseQuery('submissions', `&athlete_id=eq.${athlete.id}&approved=eq.false&order=created_at.desc&limit=1`);
  if (!subs.length) return jsonResp({ success: false, error: 'No pending submission' }, 404);
  const sub = subs[0];

  // Verify + Approve the submission
  await supabaseUpdate('submissions', sub.id, { verified: true, approved: true, reviewed: true });

  const timeStr = sub.time_display;
  const totalSec = sub.time_seconds;
  const ga = sub.grip_age || 0;

  // Sync leaderboard
  try {
    const tok = await getAccessToken();
    const approved = await syncLeaderboard(tok);
    const athleteJSON = JSON.stringify(approved.map(a => ({
      name: a.name, time: fmtTime(a.bestSec),
      gripAge: calcGripAge(a.dob, a.weight, a.gender, a.bestSec, a.height, a.training),
      tier: getTier(a.bestSec).tier, country: a.country || '', verified: a.verified,
    })));
    const newBlock = `const athletes = [\n${athleteJSON.replace(/^\[/, '').replace(/\]$/, '')}];`;
    await updateCell(tok, "'Leaderboard Cache'!A1", newBlock);
  } catch(e) { console.error('Sync:', e); }

  // Send magic link + approval email
  const aName = athlete.name || athleteEmail.split('@')[0];
  const magicToken = genToken();
  const expiresAt = new Date(Date.now() + 86400000 * 30).toISOString();
  await supabaseInsert('magic_links', {
    athlete_id: athlete.id,
    email: athleteEmail,
    token: magicToken,
    expires_at: expiresAt,
    used: false
  });

  const workerUrl = creds().PORTAL_URL || 'https://wdhc-portal.milobirk.workers.dev';
  const verifyUrl = `${workerUrl}/api/auth/verify?token=${magicToken}`;
  try {
    const tok = await getAccessToken();
    await sendEmail(tok, athleteEmail, `You're Verified! ✅ — ${timeStr}`, approvalEmail(aName, timeStr, totalSec, verifyUrl, ga));
  } catch(e) { console.error('Email:', e); }

  return jsonResp({ success: true, message: `Verified + Approved ${aName}` });
}

async function handleDeny(req, params) {
  // Accept GET (email links) and POST
  const athleteEmail = params.get('email') || '';
  const athleteName = params.get('name') || '';
  const adminKey = params.get('key') || '';
  if (adminKey !== creds().ADMIN_KEY) return jsonResp({ success: false, error: 'Unauthorized' }, 401);

  // Find athlete by email
  const athletes = await supabaseQuery('athletes', `&email=eq.${encodeURIComponent(athleteEmail)}`);
  if (!athletes.length) return jsonResp({ success: false, error: 'Athlete not found' }, 404);
  const athlete = athletes[0];

  // Find latest unapproved submission
  const subs = await supabaseQuery('submissions', `&athlete_id=eq.${athlete.id}&approved=eq.false&order=created_at.desc&limit=1`);
  if (!subs.length) return jsonResp({ success: false, error: 'No pending submission' }, 404);
  const sub = subs[0];

  // Mark as reviewed + denied
  await supabaseUpdate('submissions', sub.id, { reviewed: true, approved: false, verified: false });

  // Send denial email
  const aName = athlete.name || athleteEmail.split('@')[0];
  try {
    const tok = await getAccessToken();
    await sendEmail(tok, athleteEmail, 'WDHC Submission Update', denyEmail(aName));
  } catch(e) { console.error('Denial email:', e); }

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
