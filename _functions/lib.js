// WDHC Shared Library — pure functions (no env dependencies)
// Import in workers: import { calcGripAge, getTier, tierBadge, parseTimeSec, fmtTime } from './lib.js';

// === GRIP AGE v2 — WDHC Biological GripAge™ ===
// Quadratic age model + allometric weight/height scaling + training adjustment
// Asymmetric response: log reward for overperformance, linear penalty for underperformance
export function calcGripAge(dob, weight, gender, sec, height, training) {
  if (!sec) return '--';
  let age = 35;
  if (dob) { try { const b = new Date(dob); if (!isNaN(b.getTime())) age = Math.floor((Date.now() - b.getTime()) / (365.25 * 864e5)); } catch(e) {} }
  const isF = (gender || '').toLowerCase().includes('female');
  const refW = isF ? 140 : 180, refH = isF ? 65 : 70;
  const w = parseFloat(weight) || refW, h = parseFloat(height) || refH;
  const tr = (training || 'None').trim();
  const tM = tr === 'Advanced' ? 1.22 : tr === 'Intermediate' ? 1.15 : tr === 'Beginner' ? 1.08 : 1.0;
  const base = isF
    ? 108 - 0.95 * age + 0.005 * age * age
    : 142 - 1.15 * age + 0.006 * age * age;
  const adj = (base * Math.pow(refW / w, 0.7) * Math.pow(refH / h, 0.35) * tM * 0.7) + (base * 0.3);
  const pr = sec / Math.max(1, adj);
  const delta = pr >= 1 ? 18 * Math.log(Math.max(1, pr)) : -12 * (1 - pr);
  return Math.max(18, Math.min(95, Math.round(age - delta)));
}

// === TIER SYSTEM ===
export function getTier(sec) {
  if (sec >= 360) return { tier: 'Freak', next: '', nextSec: 0, color: '#9900ff', pop: '.001%' };
  if (sec >= 240) return { tier: 'Legend', next: 'Freak', nextSec: 360, color: '#D4AF37', pop: '0.01%' };
  if (sec >= 180) return { tier: 'Elite', next: 'Legend', nextSec: 240, color: '#A0A0A0', pop: '1%' };
  if (sec >= 120) return { tier: 'Expert', next: 'Elite', nextSec: 180, color: '#cc0000', pop: '5%' };
  if (sec >= 60) return { tier: 'Contender', next: 'Expert', nextSec: 120, color: '#666666', pop: '20%' };
  return { tier: 'Challenger', next: 'Contender', nextSec: 60, color: '#1E8449', pop: '75%' };
}

export function tierBadge(t) {
  const s = {
    Freak: 'background:#9900ff;color:#fff', Legend: 'background:#D4AF37;color:#000',
    Elite: 'background:#A0A0A0;color:#000', Expert: 'background:#cc0000;color:#fff',
    Contender: 'border:1px solid #666;color:#333', Challenger: 'border:1px solid #1E8449;color:#1E8449'
  };
  return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-weight:bold;${s[t] || ''}">${t.toUpperCase()}</span>`;
}

// === TIME ===
export function parseTimeSec(t) {
  if (!t) return 0;
  let s = String(t).trim().replace('.', ':');
  if (s.includes(':')) {
    const p = s.split(':');
    return (p.length === 3)
      ? (parseInt(p[0]) || 0) * 60 + (parseInt(p[1]) || 0)
      : (parseInt(p[0]) || 0) * 60 + (parseInt(p[1]) || 0);
  }
  const n = parseFloat(s);
  return n < 30 ? Math.round(n * 60) : Math.round(n);
}

export function fmtTime(sec) {
  const m = Math.floor(sec / 60), s = sec % 60;
  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`;
}

// === EMAIL VALIDATION ===
export function isValidEmail(email) {
  if (!email) return false;
  const e = email.trim();
  return e.includes('@') && e.length <= 254 && e.indexOf('@') < e.lastIndexOf('.');
}
