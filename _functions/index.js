// WDHC Submission Worker v2
// Handles form submission: validates → writes to Sheet → sends immediate confirmation email
// Credentials loaded from Cloudflare env inside fetch handler
let _env = null;
function creds() { return _env; }
const SPREADSHEET_ID = '1qt-KNdOMareAl2Si6WRVAuTox7avV3gGAa7zdP6EW-s';
const SHEET_NAME = 'Custom Form Submissions';

// === DATA NORMALIZATION ===
const CITY_STATE_MAP = {
  'phx arizona': 'Phoenix, Arizona', 'phx az': 'Phoenix, Arizona', 'phx': 'Phoenix, Arizona',
  'phoenix': 'Phoenix, Arizona', 'phoenix az': 'Phoenix, Arizona',
  'detroit': 'Detroit, Michigan', 'detroit mi': 'Detroit, Michigan',
  'mount pleasant': 'Mount Pleasant, Michigan', 'mt pleasant': 'Mount Pleasant, Michigan',
  'grand rapids': 'Grand Rapids, Michigan', 'chicago': 'Chicago, Illinois',
  'new york': 'New York, New York', 'nyc': 'New York, New York',
  'la': 'Los Angeles, California', 'los angeles': 'Los Angeles, California',
  'houston': 'Houston, Texas', 'houston tx': 'Houston, Texas',
  'niagra falls': 'Niagra Falls, Ontario', 'niagara falls': 'Niagara Falls, Ontario',
};
const GENDER_MAP = { 'male': 'Male', 'm': 'Male', 'man': 'Male', 'female': 'Female', 'f': 'Female', 'woman': 'Female' };
const COUNTRY_MAP = {
  'us': 'USA', 'usa': 'USA', 'united states': 'USA', 'america': 'USA',
  'uk': 'United Kingdom', 'gb': 'United Kingdom', 'england': 'United Kingdom',
  'ca': 'Canada', 'canada': 'Canada', 'au': 'Australia', 'australia': 'Australia',
  'de': 'Germany', 'germany': 'Germany', 'fr': 'France', 'france': 'France',
};

function normalizeCityState(input) {
  if (!input) return '';
  const c = input.trim().toLowerCase();
  if (CITY_STATE_MAP[c]) return CITY_STATE_MAP[c];
  for (const [k, v] of Object.entries(CITY_STATE_MAP)) { if (c.includes(k)) return v; }
  return input.trim().replace(/\b\w/g, ch => ch.toUpperCase());
}
function normalizeGender(input) { const c = (input||'').trim().toLowerCase(); return GENDER_MAP[c] || (input||'').trim().replace(/\b\w/g, ch=>ch.toUpperCase()); }
function normalizeCountry(input) { const c = (input||'').trim().toLowerCase(); return COUNTRY_MAP[c] || (input||'').trim(); }
function normalizeName(input) { return (input||'').trim().split(/\s+/).map(w=>w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()).join(' '); }
function normalizeTime(input) {
  if (!input) return '';
  const c = input.trim();
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(c)) return c;
  if (/^\d+\.\d+$/.test(c)) { const s=Math.round(parseFloat(c)*60); return `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`; }
  if (/^\d+$/.test(c)) { const s=parseInt(c); return `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`; }
  return c;
}
function normalizeForm(data) {
  const name = normalizeName(data.athleteName || '');
  const parts = name.split(/\s+/);
  return {
    athleteName: name, firstName: parts[0]||'', lastName: parts.length>1?parts[parts.length-1]:'',
    email: (data.email||'').trim().toLowerCase(), cityState: normalizeCityState(data.cityState||''),
    country: normalizeCountry(data.country||''), dob: data.dob||'', gender: normalizeGender(data.gender||''),
    weight: data.weight||'', height: data.height||'', gripTraining: data.gripTraining||'',
    attemptDate: data.attemptDate||'', time: normalizeTime(data.time||data.hangTime||''),
    videoUrl: (data.videoUrl||'').trim(), notes: (data.notes||'').trim(),
    hearAbout: data.hearAbout||'', consent: data.consent||false,
    isPR: data.isPR||'No', prevBest: data.prevBest||'', occupation: (data.occupation||'').trim(),
  };
}

// === TIME ===
function parseTimeToSeconds(t) {
  if (!t) return 0; let s=t.toString().trim().replace('.',':');
  if (s.includes(':')) { const p=s.split(':'); return (p.length===3)?(parseInt(p[0])||0)*60+(parseInt(p[1])||0):(parseInt(p[0])||0)*60+(parseInt(p[1])||0); }
  const n=parseFloat(s); return n<30?Math.round(n*60):Math.round(n);
}
function formatTime(sec) { const m=Math.floor(sec/60),s=sec%60; return m>0?`${m}:${s.toString().padStart(2,'0')}`:`${s}s`; }

// === TIER ===
function getTier(sec) {
  if (sec>=360) return{tier:'Freak',next:'',nextSec:0,color:'#9900ff',pop:'.001%'};
  if (sec>=240) return{tier:'Legend',next:'Freak',nextSec:360,color:'#D4AF37',pop:'0.01%'};
  if (sec>=180) return{tier:'Elite',next:'Legend',nextSec:240,color:'#A0A0A0',pop:'1%'};
  if (sec>=120) return{tier:'Expert',next:'Elite',nextSec:180,color:'#cc0000',pop:'5%'};
  if (sec>=60) return{tier:'Contender',next:'Expert',nextSec:120,color:'#666666',pop:'20%'};
  return{tier:'Challenger',next:'Contender',nextSec:60,color:'#1E8449',pop:'75%'};
}
function tierBadge(t) {
  const s={Freak:'background:#9900ff;color:#fff',Legend:'background:#D4AF37;color:#000',Elite:'background:#A0A0A0;color:#000',Expert:'background:#cc0000;color:#fff',Contender:'border:1px solid #666;color:#333',Challenger:'border:1px solid #1E8449;color:#1E8449'};
  return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-weight:bold;${s[t]||''}">${t.toUpperCase()}</span>`;
}

// === GRIP AGE v2 — WDHC Biological GripAge™ ===
// Quadratic age model + allometric weight/height scaling + training adjustment
// Asymmetric response: log reward for overperformance, linear penalty for underperformance
function gripAge(dob, weight, gender, sec, height, gripTraining) {
  if (!sec) return '--';
  let age = 35;
  if (dob) { try { const b = new Date(dob); if (!isNaN(b.getTime())) age = Math.floor((Date.now() - b.getTime()) / (365.25 * 24 * 60 * 60 * 1000)); } catch(e) {} }
  const isF = (gender || '').toLowerCase().includes('female');
  const refW = isF ? 140 : 180;
  const refH = isF ? 65 : 70;
  const w = parseFloat(weight) || refW;
  const h = parseFloat(height) || refH;
  // Training multiplier: None=1.0, Beginner=1.08, Intermediate=1.15, Advanced=1.22
  const training = (gripTraining || 'None').toString().trim();
  const tMult = training === 'Advanced' ? 1.22 : training === 'Intermediate' ? 1.15 : training === 'Beginner' ? 1.08 : 1.0;
  // Quadratic age model: captures accelerating decline after 50
  const base = isF
    ? 108 - (0.95 * age) + (0.005 * age * age)
    : 142 - (1.15 * age) + (0.006 * age * age);
  // Allometric scaling: weight^0.70, height^0.35
  const wAdj = Math.pow((refW / w), 0.70);
  const hAdj = Math.pow((refH / h), 0.35);
  const adjExp = (base * wAdj * hAdj * tMult * 0.70) + (base * 0.30);
  const pr = sec / Math.max(1, adjExp);
  // Asymmetric response
  let delta;
  if (pr >= 1.0) {
    delta = 18 * Math.log(Math.max(1.0, pr));
  } else {
    delta = -12 * (1.0 - pr);
  }
  const ga = age - delta;
  return Math.max(18, Math.min(95, Math.round(ga * 10) / 10));
}

// === EMAIL TEMPLATE ===
function buildEmail(n, totalSec, formattedTime) {
  const fn=n.athleteName.split(' ')[0];
  const t=getTier(totalSec);
  const badge=tierBadge(t.tier);
  const thresholds={Challenger:0,Contender:60,Expert:120,Elite:180,Legend:240,Freak:360};
  const range=(t.nextSec-(thresholds[t.tier]||0))||60;
  const pct=Math.min(100,Math.max(0,Math.round(((totalSec-(thresholds[t.tier]||0))/range)*100)));
  const gap=t.nextSec-totalSec;
  const ga=gripAge(n.dob,n.weight,n.gender,totalSec,n.height,n.gripTraining);
  const bar=t.next?`<div style="margin:25px 0;padding:20px;background:#f8f9fa;border-radius:8px;"><p style="margin:0 0 10px 0;color:#666;font-size:12px;text-align:center;text-transform:uppercase;letter-spacing:1px;">Next: ${t.next} Tier</p><div style="background:#e9ecef;border-radius:4px;height:8px;overflow:hidden;"><div style="background:${t.color};width:${pct}%;height:100%;"></div></div><p style="margin:8px 0 0 0;color:#888;font-size:12px;text-align:center;">${formatTime(gap)} to go</p></div>`:'';
  let stat;
  if(totalSec<30) stat="Every champion starts by conquering the first few seconds of gravity.";
  else if(totalSec<60) stat="Approaching the 60-second mark is where the real physiological shifts happen.";
  else if(totalSec<120) stat="Passing the 1-minute threshold is a major longevity milestone.";
  else if(totalSec<180) stat="A 2-minute hold proves your structural resilience.";
  else if(totalSec<240) stat="Holding for 3 minutes is a rare feat of grit.";
  else if(totalSec<360) stat="Crossing into the 4-minute realm is a masterclass in endurance.";
  else stat="6 minutes of pure hang time is a biological statement.";

  return `<div style="background-color:#000;padding:40px 20px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background-color:#fff;border-radius:8px;overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,0.2);">
<div style="background-color:#000;padding:30px;text-align:center;">
<h1 style="color:#fff;margin:0;letter-spacing:2px;font-size:24px;">WORLD DEAD HANG</h1>
<p style="color:#D4AF37;margin:5px 0 0 0;font-weight:bold;letter-spacing:1px;">CHAMPIONSHIP</p>
</div>
<div style="padding:40px 30px;">
<h2 style="color:#000;margin-top:0;">Nice work, ${fn}.</h2>
<p style="color:#444;font-size:16px;line-height:1.6;">Your submission of <strong>${formattedTime}</strong> has been received and is now under review. We'll verify your video and get back to you once approved!</p>
<div style="background-color:#f9f9f9;border:1px solid #eee;border-radius:6px;padding:25px;margin:30px 0;text-align:center;">
<p style="margin:0;color:#888;text-transform:uppercase;font-size:12px;font-weight:bold;letter-spacing:1px;">Official Hold Time</p>
<h1 style="margin:5px 0;color:#000;font-size:48px;">${formattedTime}</h1>
<div style="margin-top:10px;">${badge}</div>
<p style="margin:8px 0 0 0;color:#888;font-size:13px;">Top ${t.pop} of athletes worldwide</p>
</div>
<p style="color:#000;font-size:15px;line-height:1.6;text-align:center;">${stat}</p>
${bar}
<hr style="border:0;border-top:1px solid #eee;margin:30px 0;">
<div style="background-color:#000;color:#fff;padding:30px;border-radius:8px;text-align:center;">
<h3 style="margin:0;color:#D4AF37;text-transform:uppercase;letter-spacing:2px;font-size:28px;">GripAge™: ${ga}</h3>
<p style="margin:10px 0 0 0;color:#eee;font-size:13px;">Your chronological age is ${n.dob?Math.floor((Date.now()-new Date(n.dob).getTime())/(365.25*24*60*60*1000)):'—'}. ${ga<35?'Your grip is outperforming your years.':'Consistency will unlock your next level.'}</p>
</div>
<h4 style="color:#000;text-transform:uppercase;font-size:12px;letter-spacing:1px;margin-bottom:15px;">The Science of the Hang</h4>
<div style="margin-bottom:15px;"><p style="margin:0;font-weight:bold;color:#333;font-size:14px;">Spinal Decompression</p><p style="margin:5px 0 0 0;color:#666;font-size:13px;line-height:1.5;">Dead hangs apply natural traction to the spine. Just 60 seconds can rehydrate spinal discs, reducing back pain.</p></div>
<div style="margin-bottom:15px;"><p style="margin:0;font-weight:bold;color:#333;font-size:14px;">Longevity Marker</p><p style="margin:5px 0 0 0;color:#666;font-size:13px;line-height:1.5;">Studies show grip strength predicts cardiovascular health more accurately than blood pressure.</p></div>
<p style="color:#444;font-size:14px;line-height:1.6;margin-top:30px;">You'll receive another email within 24-48 hours once your video is verified.</p>
<br><p style="color:#000;font-weight:bold;margin-bottom:0;">Milo</p><p style="color:#666;margin-top:4px;font-size:13px;">Founder, WDHC</p>
</div>
<div style="background-color:#f9f9f9;padding:20px;text-align:center;border-top:1px solid #eee;">
<p style="color:#aaa;font-size:11px;margin:0;">&copy; 2026 World Dead Hang Championship. Stay gritty.</p>
</div>
</div></div>`;
}

// === GMAIL ===
async function sendEmail(accessToken, to, subject, htmlBody) {
  const mime = `To: ${to}\r\nFrom: support@worlddeadhang.com\r\nSubject: ${subject}\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n${htmlBody}`;
  let raw;
  try { raw = btoa(unescape(encodeURIComponent(mime))); } catch(e) { raw = btoa(mime); }
  raw = raw.replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  const resp = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method:'POST', headers:{'Authorization':`Bearer ${accessToken}`,'Content-Type':'application/json'},
    body: JSON.stringify({raw}),
  });
  if (!resp.ok) { const err=await resp.text(); console.error('Gmail error:',resp.status,err); }
  return resp.ok;
}

// === OAUTH ===
async function getAccessToken() {
  const c = creds();
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body: new URLSearchParams({client_id:c.GOOGLE_CLIENT_ID,client_secret:c.GOOGLE_CLIENT_SECRET,refresh_token:c.GOOGLE_REFRESH_TOKEN,grant_type:'refresh_token'}),
  });
  return (await r.json()).access_token;
}

// === WORKER (ES Module format) ===
export default {
  async fetch(request, env, ctx) {
    _env = env;
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
    return handleRequest(request);
  }
};

async function handleRequest(request) {
  try {
    const data = await request.json();
    const n = normalizeForm(data);
    if (!n.athleteName || !n.email) return new Response(JSON.stringify({success:false,error:'Missing required fields'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});

    const token = await getAccessToken();
    const subId = 'SUB-'+Date.now()+'-'+Math.random().toString(36).substr(2,9);
    const row = [new Date().toISOString(),subId,n.athleteName,n.firstName,n.lastName,n.email,n.cityState,n.country,n.dob,n.gender,n.weight,n.height,n.gripTraining,n.attemptDate,n.time,n.videoUrl,n.notes,n.hearAbout,n.consent?'Yes':'No','No','Pending','No',n.isPR,n.prevBest,'',n.occupation];

    const sheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A:AA:append?valueInputOption=USER_ENTERED`;
    const sheetResp = await fetch(sheetUrl, {method:'POST',headers:{'Authorization':`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({values:[row]})});
    if (!sheetResp.ok) { const err=await sheetResp.text(); return new Response(JSON.stringify({success:false,error:'Failed to save: '+err}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}}); }

    // Send immediate confirmation email
    const totalSec = parseTimeToSeconds(n.time);
    const formattedTime = formatTime(totalSec);
    const ga = gripAge(n.dob, n.weight, n.gender, totalSec, n.height, n.gripTraining);
    const subject = 'Your WDHC Submission Received - Under Review';
    const html = buildEmail(n, totalSec, formattedTime);
    let emailSent = false;
    try { emailSent = await sendEmail(token, n.email, subject, html); } catch(e) { console.error('Email error:', e); }

    // Admin notification
    try {
      const pUrl = creds().PORTAL_URL || 'https://wdhc-portal.milobirk.workers.dev';
      const adminHtml = `<div style="font-family:sans-serif;padding:20px;background:#1a1a1a;color:#fff;border-radius:8px;">
        <h2 style="color:#D4AF37;margin-top:0;">🏆 New Public Submission</h2>
        <p><strong style="color:#fff;">${n.athleteName}</strong> (${n.email})</p>
        <p style="font-size:24px;color:#D4AF37;margin:15px 0;"><strong>${formattedTime}</strong></p>
        <p style="color:#aaa;">GripAge™: <strong style="color:#fff;">${ga}</strong></p>
        <div style="margin:25px 0;display:flex;gap:10px;flex-wrap:wrap;">
          <a href="${pUrl}/api/admin/approve?email=${encodeURIComponent(n.email)}&name=${encodeURIComponent(n.athleteName)}&key=${creds().ADMIN_KEY}" style="background:#1E8449;color:#fff;padding:12px 20px;text-decoration:none;border-radius:4px;font-weight:bold;">✅ Approve</a>
          <a href="${pUrl}/api/admin/verify-approve?email=${encodeURIComponent(n.email)}&name=${encodeURIComponent(n.athleteName)}&key=${creds().ADMIN_KEY}" style="background:#D4AF37;color:#000;padding:12px 20px;text-decoration:none;border-radius:4px;font-weight:bold;">⭐ Verify+Approve</a>
          <a href="${pUrl}/api/admin/deny?email=${encodeURIComponent(n.email)}&name=${encodeURIComponent(n.athleteName)}&key=${creds().ADMIN_KEY}" style="background:#cc0000;color:#fff;padding:12px 20px;text-decoration:none;border-radius:4px;font-weight:bold;">❌ Deny</a>
        </div>
        <p style="color:#666;font-size:12px;"><a href="https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}" style="color:#888;">Review in Sheet</a></p>
      </div>`;
      await sendEmail(token, 'milobirk@gmail.com', `📬 ${n.athleteName} — ${formattedTime}`, adminHtml);
    } catch(e) { console.error('Admin notify error:', e); }

    // Mark Emailed = Confirm so cron knows confirmation was sent
    if (emailSent) {
      try {
        const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A:A`,{headers:{'Authorization':`Bearer ${token}`}});
        const lastRow = ((await r.json()).values||[]).length;
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!T${lastRow}?valueInputOption=USER_ENTERED`,{method:'PUT',headers:{'Authorization':`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({values:[['Confirm']]})});
      } catch(e) { console.error('Update error:',e); }
    }

    return new Response(JSON.stringify({success:true,message:'Submission received! Check your email for confirmation.',emailSent}),{status:200,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
  } catch(e) {
    return new Response(JSON.stringify({success:false,error:e.message}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
  }
}
