import os
import json
import base64
import math
import requests
import sys
import random
import string
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.header import Header
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from google.oauth2 import service_account

# --- WDHC PRODUCTION EMAIL AUTOMATION V4.2 (BATCH AUTOMATION) ---
# Combined V4.1 HTML/Normalization with V3.6 Batch/Reporting Logic.
# FIXED: Absolute paths for reports and vault.

GMAIL_TOKEN_PATH="/home/milobirk/.hermes/profiles/wdhc/google_token.json"
SERVICE_ACCOUNT_PATH = "/home/milobirk/.hermes/.openclaw/credentials/google-service-account.json"
SPREADSHEET_ID = "1qt-KNdOMareAl2Si6WRVAuTox7avV3gGAa7zdP6EW-s"
APPS_SCRIPT_VERIFY_URL = "https://script.google.com/macros/s/AKfycbzlBwec8bBwU-WXM6V3eM2IURRdnwRsfA-_F7qroG-aeX4NPwKyOYl6mN4E_Ba1pw-PCA/exec"
VAULT_DIR = "/home/milobirk/.hermes/profiles/wdhc/Workspace/WDHC/production/vault"
REPORTS_DIR = "/home/milobirk/.hermes/profiles/wdhc/Workspace/WDHC/production/reports"

os.makedirs(VAULT_DIR, exist_ok=True)
os.makedirs(REPORTS_DIR, exist_ok=True)

# --- UTILS ---

def generate_token(length=32):
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))

def parse_time_to_seconds(time_str):
    if not time_str: return 0
    s = str(time_str).strip().replace('.', ':')
    if ':' in s:
        p = s.split(':')
        if len(p) == 3: # MM:SS:CC
            m, sec, c = p[0], p[1], p[2]
            return (int(m) if m.isdigit() else 0) * 60 + (int(sec) if sec.isdigit() else 0)
        elif len(p) == 2: # MM:SS
            m, sec = p[0], p[1]
            return (int(m) if m.isdigit() else 0) * 60 + (int(sec) if sec.isdigit() else 0)
    try:
        num = float(s)
        if num < 30: return int(num * 60)
        return int(num)
    except: return 0

def format_time(sec):
    m = sec // 60
    s = sec % 60
    return f"{m}:{s:02d}" if m > 0 else f"{s}s"

def sanitize_athlete(a):
    a['Name'] = str(a.get('Name', '')).strip().title()
    a['Email'] = str(a.get('Email', '')).strip().lower()
    try:
        w = str(a.get('Weight', '')).replace('lb', '').replace('lbs', '').strip()
        a['Weight'] = float(w) if w else 175
    except: a['Weight'] = 175
    try:
        h = str(a.get('Height', '')).replace('"', '').replace("'", '').strip()
        a['Height'] = float(h) if h else 70
    except: a['Height'] = 70
    return a

def get_tier_badge(tier):
    styles = {
        "Freak": "background: #9900ff; color: #fff;",
        "Legend": "background: #D4AF37; color: #000;",
        "Elite": "background: #E0E0E0; color: #000;",
        "Expert": "background: #cc0000; color: #fff;",
        "Contender": "border: 1px solid #666; color: #333;",
        "Challenger": "border: 1px solid #1E8449; color: #1E8449;"
    }
    style = styles.get(tier, "background: #666; color: #fff;")
    return f'<span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: bold; {style}">{tier.upper()}</span>'

def calculate_grip_age(dob, weight, gender, actual_time, height):
    chronological_age = 35
    if dob:
        try:
            for fmt in ("%m/%d/%Y", "%Y-%m-%d", "%d/%m/%Y"):
                try:
                    birth_date = datetime.strptime(str(dob).strip(), fmt)
                    today = datetime.now()
                    chronological_age = (today - birth_date).days // 365
                    break
                except: continue
        except: pass
    is_female = 'female' in str(gender).lower()
    if chronological_age <= 29: base_expected = 80 if is_female else 105
    elif chronological_age <= 39: base_expected = 65 if is_female else 85
    elif chronological_age <= 49: base_expected = 50 if is_female else 65
    elif chronological_age <= 59: base_expected = 38 if is_female else 50
    else: base_expected = 25 if is_female else 35
    w_float, h_float = float(weight), float(height)
    weight_adj = pow(((135 if is_female else 175) / max(1, w_float)), 0.7)
    height_adj = pow((70 / max(1, h_float)), 0.5)
    adj_expected = (base_expected * weight_adj * height_adj * 0.7) + (base_expected * 0.3)
    performance_ratio = actual_time / max(1, adj_expected)
    grip_age_raw = chronological_age - (math.log(max(0.1, performance_ratio)) * 20)
    if chronological_age < 18: return {"age": "N/A (Youth)", "chronologicalAge": chronological_age, "isYouth": True}
    return {"age": max(18, min(85, round(grip_age_raw))), "chronologicalAge": chronological_age, "isYouth": False}

def get_html_template(a, portal_token=None):
    name, time_str, dob, gender, weight, height = a['Name'], a['Time'], a['DOB'], a['Gender'], a['Weight'], a['Height']
    total_sec = parse_time_to_seconds(time_str)
    formatted_time = format_time(total_sec)
    first_name = name.split(' ')[0]
    is_pr = str(a.get('IsPR', '')).strip().lower() == 'yes'
    prev_best = str(a.get('PrevBest', '')).strip()

    is_verified = str(a.get('Verified', '')).strip().lower() == 'yes'
    
    if is_verified:
        # APPROVAL EMAIL - they're now on the leaderboard!
        subject = f"You're on the Leaderboard, {first_name}! - {formatted_time} - World Dead Hang Championship"
        intro_sentence = f"Great news, {first_name}! Your submission has been verified and you're now officially on the WDHC global leaderboard. Welcome to the competition!"
    elif not prev_best or prev_best.lower() in ['none', 'n/a', '', '0']:
        # INITIAL SUBMISSION - under review, not on leaderboard yet
        subject = f"Your WDHC Submission Received - Under Review - World Dead Hang Championship"
        intro_sentence = f"Welcome to the community, {first_name}. Your submission of {formatted_time} has been received and is now under review. We'll verify your video and get back to you once approved!"
    elif is_pr:
        # PR SUBMISSION - under review (beat previous best)
        subject = f"NEW PERSONAL RECORD! 🔥 {formatted_time} - {name} - World Dead Hang Championship"
        intro_sentence = f"You're getting stronger, {first_name}. You just crushed your previous best of {prev_best} and set a new Personal Record. Your video is now under review - we'll verify it and get back to you once approved! Consistency is paying off."
    else:
        # RETURNING ATHLETE - under review (has prev_best, but not a PR)
        subject = f"Another solid hang, {first_name} - {formatted_time} - World Dead Hang Championship"
        intro_sentence = f"Consistency is where the real gains happen, {first_name}. While this wasn't a new PR today, you're logging the time and thickening those tendons. Your video is under review - we'll verify it and get back to you once approved!"

    pop_pct = {"Freak": ".001%", "Legend": "0.01%", "Elite": "1%", "Expert": "5%", "Contender": "20%", "Challenger": "75%"}
    tier, next_tier, next_sec, color = "Challenger", "Contender", 60, "#1E8449"
    if total_sec >= 360: tier, next_tier, color = "Freak", "", "#9900ff"
    elif total_sec >= 240: tier, next_tier, next_sec, color = "Legend", "Freak", 360, "#D4AF37"
    elif total_sec >= 180: tier, next_tier, next_sec, color = "Elite", "Legend", 240, "#E0E0E0"
    elif total_sec >= 120: tier, next_tier, next_sec, color = "Expert", "Elite", 180, "#cc0000"
    elif total_sec >= 60: tier, next_tier, next_sec, color = "Contender", "Expert", 120, "#666666"
    
    if total_sec < 30: time_stat = "Every champion starts by conquering the first few seconds of gravity\u2014you've officially begun the process of re-wiring your central nervous system for elite grip strength."
    elif total_sec < 45: time_stat = "Breaking the 30-second barrier means you've moved past simple grip and are now building the foundational tendon density required for true longevity."
    elif total_sec < 60: time_stat = "Approaching the 60-second mark is where the real physiological shifts happen\u2014you're training your shoulders and spine to handle the weight of the world."
    elif total_sec < 120: time_stat = "Passing the 1-minute threshold is a major longevity milestone; studies suggest this level of grip endurance is a primary indicator of a healthy, resilient heart."
    elif total_sec < 180: time_stat = "A 2-minute hold proves your structural resilience\u2014you're effectively bulletproofing your joints and decompressing your spine with every second."
    elif total_sec < 240: time_stat = "Holding for 3 minutes is a rare feat of grit; you've achieved a level of functional durability that places you in the upper echelon of dead-hang athletes."
    elif total_sec < 360: time_stat = "Crossing into the 4-minute realm is a masterclass in mental and physical endurance\u2014this level of isometric strength is a superpower for long-term vitality."
    else: time_stat = "6 minutes of pure hang time is a biological statement; you have developed a grip that is virtually unshakeable and a spirit that refuses to let go."
    
    if next_tier == "Contender": tier_benefit = f"Leveling up to Contender means you'll surpass the 1-minute mark and enter the top {pop_pct['Contender']} of the population."
    elif next_tier == "Expert": tier_benefit = f"Reaching the Expert tier signifies a 2-minute hold, placing you in the top {pop_pct['Expert']} of human performance."
    elif next_tier == "Elite": tier_benefit = f"Elite status (3 minutes) places you in the top {pop_pct['Elite']} of the community, demonstrating exceptional neurological grit."
    elif next_tier == "Legend": tier_benefit = f"Becoming a Legend (4 minutes) means you've entered the top {pop_pct['Legend']} of humanity, where your grip is a primary indicator of elite-level health."
    elif next_tier == "Freak": tier_benefit = f"The Freak tier (6+ minutes) is reserved for the absolute {pop_pct['Freak']} outliers. You're on the radar for Pro Class."
    else: tier_benefit = f"You have reached the ultimate peak, belonging to the elite {pop_pct['Freak']} of athletes. You are qualified for consideration in our upcoming Pro Class."
    
    tier_badge, next_badge, gap = get_tier_badge(tier), get_tier_badge(next_tier) if next_tier else "", next_sec - total_sec
    current_pop_pct = pop_pct[tier]
    motivational_text = f"{time_stat} You're currently in the <strong>{tier_badge}</strong> tier (Top {current_pop_pct} of Population). You are only <strong>{format_time(gap)}</strong> away from {next_badge}. {tier_benefit}" if next_tier else f"{time_stat} <span style=\"color: {color}; font-weight: bold;\">{tier.upper()} TIER REACHED (Top {current_pop_pct} of Population).</span> {tier_benefit}"
    
    grip_data = calculate_grip_age(dob, weight, gender, total_sec, height)
    if grip_data['isYouth']:
        grip_display, personal_note = "Protected (Under 18)", "As a youth athlete, your focus should be on neurological adaptation and technique."
    else:
        grip_display = f"Grip Age: {grip_data['age']}"
        age_diff = grip_data['chronologicalAge'] - grip_data['age']
        if age_diff > 0: personal_note = f"Your Grip Age is <strong>{age_diff} years younger</strong> than your chronological age. Your systemic health and neurological grit are outperforming your years."
        elif age_diff < 0: personal_note = f"Your Grip Age is currently higher than your chronological age. This indicates a massive opportunity for growth in tendon density and spinal health."
        else: personal_note = f"Your Grip Age perfectly matches your chronological age. You are meeting the baseline for your biological profile\u2014consistency will unlock the next level."

    science_sections = [
        {"title": "Spinal Decompression", "fact": "Dead hangs apply a natural traction to the spine. Just 60 seconds of hanging can create enough space between your vertebrae to allow nutrient-rich fluid to rehydrate your spinal discs, significantly reducing lower back pain and improving posture."},
        {"title": "Longevity Marker", "fact": "Scientific studies (like the PURE study of 140,000 adults) show that grip strength is a more accurate predictor of cardiovascular health and all-cause mortality than systolic blood pressure. It is a fundamental proxy for your overall 'biological age'."}
    ]
    science_html = "".join([f'<div style="margin-bottom: 20px;"><p style="margin: 0; font-weight: bold; color: #333; font-size: 14px;">{s["title"]}</p><p style="margin: 5px 0 0 0; color: #666; font-size: 13px; line-height: 1.5;">{s["fact"]}</p></div>' for s in science_sections])

    portal_button_html = ""
    if portal_token:
        verify_url = f"{APPS_SCRIPT_VERIFY_URL}?action=auth/verify&token={portal_token}"
        portal_button_html = f'''
        <div style="text-align: center; margin: 30px 0;">
          <a href="{verify_url}" style="background-color: #D4AF37; color: #000; padding: 15px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 10px rgba(212,175,55,0.3);">LOGIN TO YOUR DASHBOARD</a>
          <p style="color: #888; font-size: 12px; margin-top: 10px;">One-click access to your personalized stats and training logs.</p>
        </div>
        '''

    html = f'''
    <div style="background-color: #000; padding: 40px 20px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
        <div style="background-color: #000; padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; letter-spacing: 2px; font-size: 24px;">WORLD DEAD HANG</h1>
          <p style="color: #D4AF37; margin: 5px 0 0 0; font-weight: bold; letter-spacing: 1px;">CHAMPIONSHIP</p>
        </div>
        <div style="padding: 40px 30px;">
          <h2 style="color: #000; margin-top: 0;">Nice work, {first_name}.</h2>
          <p style="color: #444; font-size: 16px; line-height: 1.6;">{intro_sentence}</p>
          <div style="background-color: #f9f9f9; border: 1px solid #eee; border-radius: 6px; padding: 25px; margin: 30px 0; text-align: center;">
            <p style="margin: 0; color: #888; text-transform: uppercase; font-size: 12px; font-weight: bold; letter-spacing: 1px;">Official Hold Time</p>\n            <h1 style="margin: 5px 0; color: #000; font-size: 48px;">{formatted_time}</h1>
            <div style="margin-top: 10px;">{tier_badge}</div>
          </div>
          <p style="color: #000; font-size: 16px; line-height: 1.6; text-align: center;">{motivational_text}</p>
          {portal_button_html}
          <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
          <div style="background-color: #000; color: #fff; padding: 30px; border-radius: 8px; margin: 30px 0; text-align: center;">
            <div style="margin-bottom: 20px;">
              <h3 style="margin: 0; color: #D4AF37; text-transform: uppercase; letter-spacing: 2px; font-size: 28px;">{grip_display}</h3>
              <p style="margin: 10px 0 0 0; color: #eee; font-size: 14px; line-height: 1.5;">{personal_note}</p>
            </div>
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-top: 1px solid #333; padding-top: 20px;">
              <tr>
                <td align="center" width="33%"><p style="margin: 0; color: #888; font-size: 11px; text-transform: uppercase;">Weight</p><p style="margin: 5px 0 0 0; font-weight: bold; font-size: 18px;">{weight} lbs</p></td>
                <td align="center" width="33%"><p style="margin: 0; color: #888; font-size: 11px; text-transform: uppercase;">Height</p><p style="margin: 5px 0 0 0; font-weight: bold; font-size: 18px;">{height}"</p></td>
                <td align="center" width="33%"><p style="margin: 0; color: #888; font-size: 11px; text-transform: uppercase;">Age</p><p style="margin: 5px 0 0 0; font-weight: bold; font-size: 18px;">{grip_data['chronologicalAge']}</p></td>
              </tr>
            </table>
          </div>
          <h4 style="color: #000; text-transform: uppercase; font-size: 12px; letter-spacing: 1px; margin-bottom: 15px;">The Science of the Hang</h4>
          {science_html}
          <p style="color: #444; font-size: 14px; line-height: 1.6; margin-top: 30px;">Your ranking will be live on worlddeadhang.com within 24-48 hours once verified.</p>
          <br><p style="color: #000; font-weight: bold; margin-bottom: 0;">Milo</p><p style="color: #666; margin-top: 4px; font-size: 13px;">Founder, WDHC</p>
        </div>
          <div style="background-color: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #eee;">
            <p style="color: #aaa; font-size: 11px; margin: 0;">&copy; 2026 World Dead Hang Championship. Stay gritty.</p>
            <div style="margin-top: 15px;">
              <a href="https://worlddeadhang.com">
                <img src="https://worlddeadhang.com/assets/wdhc-logo-bronze-v2.png" alt="WDHC Logo" style="height: 40px; filter: drop-shadow(0 2px 10px rgba(0,0,0,0.5));">
              </a>
            </div>
          </div>
      </div>
    </div>
    '''
    return subject, html

# ============================================
# APPROVAL EMAIL - Verified + Checkmark (SPRUCED UP)
# ============================================
def get_approval_email_html(a, portal_token=None):
    """Special email for verified/approved athletes - celebrates their leaderboard placement with gamification"""
    name, time_str, dob, gender, weight, height = a['Name'], a['Time'], a['DOB'], a['Gender'], a['Weight'], a['Height']
    total_sec = parse_time_to_seconds(time_str)
    formatted_time = format_time(total_sec)
    first_name = name.split(' ')[0]
    is_pr = str(a.get('IsPR', '')).strip().lower() == 'yes'
    prev_best = str(a.get('PrevBest', '')).strip()
    country = a.get('Country', '')

    # Approval subject - celebratory
    if is_pr:
        subject = f"NEW PERSONAL RECORD! {formatted_time} - You're on the Leaderboard, {first_name}! - World Dead Hang Championship"
    else:
        subject = f"You're on the Leaderboard, {first_name}! - WDHC Verified - World Dead Hang Championship"

    # Tier calculation
    pop_pct = {"Freak": ".001%", "Legend": "0.01%", "Elite": "1%", "Expert": "5%", "Contender": "20%", "Challenger": "75%"}
    tier, next_tier, next_sec = "Challenger", "Contender", 60
    if total_sec >= 360: tier, next_tier = "Freak", ""
    elif total_sec >= 240: tier, next_tier, next_sec = "Legend", "Freak", 360
    elif total_sec >= 180: tier, next_tier, next_sec = "Elite", "Legend", 240
    elif total_sec >= 120: tier, next_tier, next_sec = "Expert", "Elite", 180
    elif total_sec >= 60: tier, next_tier, next_sec = "Contender", "Expert", 120
    
    # Refined, bright yellow palette
    tier_colors = {"Freak": "#8B5CF6", "Legend": "#D4AF37", "Elite": "#9CA3AF", "Expert": "#EF4444", "Contender": "#6B7280", "Challenger": "#10B981"}
    tier_color = tier_colors.get(tier, "#10B981")

    # Progress to next tier - accurate calculation
    tier_thresholds = {"Challenger": 0, "Contender": 60, "Expert": 120, "Elite": 180, "Legend": 240, "Freak": 360}
    current_tier_start = tier_thresholds.get(tier, 0)
    tier_range = next_sec - current_tier_start if next_sec else 60
    progress_pct = min(100, max(0, int(((total_sec - current_tier_start) / tier_range) * 100))) if tier_range > 0 else 0
    
    # Gap to next tier
    gap = next_sec - total_sec if next_sec else 0
    
    # Grip age
    grip_data = calculate_grip_age(dob, weight, gender, total_sec, height)
    grip_display = f"{grip_data['age']}" if not grip_data['isYouth'] else "18"
    
    # Fun facts based on tier
    fun_facts = {
        "Freak": "You can hang for 6+ minutes — that's longer than most people can hold their breath!",
        "Legend": "At 4 minutes, your grip strength predicts cardiovascular health better than blood pressure.",
        "Elite": "3 minutes of dead hangs can increase HGH by 30% — that's natural muscle-building!",
        "Expert": "2 minutes is where real tendon remodeling happens. You're building bulletproof joints.",
        "Contender": "You've broken 60 seconds — your spinal discs are getting real decompression benefits.",
        "Challenger": "Every second builds neural pathways. Consistency is your superpower."
    }
    fun_fact = fun_facts.get(tier, "Your grip strength is a predictor of longevity.")

    # PR celebration block
    pr_block = ""
    if is_pr and prev_best:
        pr_block = f'''
        <div style="background: #1a1a1a; border: 1px solid #D4AF37; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 25px;">
            <p style="margin: 0; color: #D4AF37; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">NEW PERSONAL RECORD</p>
            <p style="margin: 8px 0 0 0; color: #fff; font-size: 24px; font-weight: bold;">{prev_best} → {formatted_time}</p>
        </div>'''

    # Portal link - uses tier color
    portal_button = ""
    if portal_token:
        verify_url = f"{APPS_SCRIPT_VERIFY_URL}?action=auth/verify&token={portal_token}"
        portal_button = f'''
        <div style="text-align: center; margin: 30px 0;">
          <a href="{verify_url}" style="background-color: {tier_color}; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block;">VIEW YOUR ATHLETE PORTAL</a>
          <p style="color: #666; font-size: 12px; margin-top: 10px;">Track your progress & unlock achievements</p>
        </div>'''

    # Progress bar to next tier
    progress_bar = ""
    if next_tier:
        progress_bar = f'''
        <div style="margin: 25px 0; padding: 20px; background: #f8f9fa; border-radius: 8px;">
            <p style="margin: 0 0 10px 0; color: #666; font-size: 12px; text-align: center; text-transform: uppercase; letter-spacing: 1px;">Next: {next_tier} Tier</p>
            <div style="background: #e9ecef; border-radius: 4px; height: 8px; overflow: hidden;">
                <div style="background: {tier_color}; width: {progress_pct}%; height: 100%;"></div>
            </div>
            <p style="margin: 8px 0 0 0; color: #888; font-size: 12px; text-align: center;">{format_time(gap)} to go</p>
        </div>'''

    html = f'''
    <div style="background-color: #f5f5f5; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
        <!-- Header -->
        <div style="background-color: #111; padding: 30px; text-align: center;">
          <p style="color: #666; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 8px 0;">World Dead Hang</p>
          <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 1px;">CHAMPIONSHIP</h1>
        </div>
        
        <!-- Verified Badge -->
        <div style="background: #D4AF37; padding: 24px; text-align: center;">
          <span style="display: inline-block; color: #000; font-size: 28px; font-weight: 700; letter-spacing: 2px;">✓ VERIFIED</span>
        </div>
        
        <!-- Body -->
        <div style="padding: 30px;">
          <h2 style="color: #111; margin: 0 0 15px 0; font-size: 24px; font-weight: 700;">You're in, {first_name}.</h2>
          <p style="color: #555; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;">Your submission has been verified and you're now on the global leaderboard.</p>
          
          {pr_block}
          
          <!-- Time Card -->
          <div style="background: #fafafa; border: 1px solid #e5e5e5; border-radius: 12px; padding: 25px; text-align: center; margin-bottom: 20px;">
            <p style="margin: 0; color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Your Hang Time</p>
            <p style="margin: 10px 0; color: #111; font-size: 48px; font-weight: 700; letter-spacing: -1px;">{formatted_time}</p>
            <div style="display: inline-block; background: {tier_color}; color: #fff; padding: 6px 14px; border-radius: 16px; font-weight: 600; font-size: 12px; text-transform: uppercase;">{tier} Tier</div>
            <p style="margin: 12px 0 0 0; color: #888; font-size: 13px;">Top {pop_pct[tier]} of athletes worldwide</p>
          </div>
          
          {progress_bar}
          
          {portal_button}
          
          <!-- Grip Age - prominent display -->
          <div style="background: linear-gradient(135deg, #111 0%, #222 100%); border: 1px solid {tier_color}; padding: 24px; border-radius: 12px; text-align: center; margin-top: 25px;">
            <p style="margin: 0; color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">Grip Age</p>
            <p style="margin: 10px 0 0 0; color: #fff; font-size: 52px; font-weight: 700; line-height: 1;">{grip_display}</p>
            <p style="margin: 5px 0 0 0; color: #666; font-size: 12px;">years young</p>
          </div>
          
          <!-- Fun Fact -->
          <div style="background: #fefce8; border-left: 3px solid #D4AF37; padding: 12px 15px; border-radius: 0 6px 6px 0; margin: 20px 0;">
            <p style="margin: 0; color: #666; font-size: 13px; font-style: italic;">💡 {fun_fact}</p>
          </div>
          
          <p style="color: #888; font-size: 13px; text-align: center; margin-top: 25px;">Your ranking is live at worlddeadhang.com</p>
        </div>
        
        <!-- Footer -->
        <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #eee;">
          <p style="margin: 0; color: #999; font-size: 11px;">© 2026 World Dead Hang Championship</p>
          <div style="margin-top: 15px;">
            <a href="https://worlddeadhang.com">
              <img src="https://worlddeadhang.com/assets/wdhc-logo-bronze-v2.png" alt="WDHC Logo" style="height: 40px; filter: drop-shadow(0 2px 10px rgba(0,0,0,0.5));">
            </a>
          </div>
        </div>
      </div>
    </div>
    '''
    return subject, html

# ============================================
# APPROVED (No Checkmark) - Leaderboard but no video checkmark (SPRUCED UP)
# ============================================
def get_approved_no_checkmark_email_html(a, portal_token=None):
    """Email for athletes on leaderboard but without video verification checkmark - spruced up"""
    name, time_str, dob, gender, weight, height = a['Name'], a['Time'], a['DOB'], a['Gender'], a['Weight'], a['Height']
    total_sec = parse_time_to_seconds(time_str)
    formatted_time = format_time(total_sec)
    first_name = name.split(' ')[0]
    is_pr = str(a.get('IsPR', '')).strip().lower() == 'yes'
    prev_best = str(a.get('PrevBest', '')).strip()

    subject = f"You're on the Leaderboard, {first_name}! - WDHC"

    # Tier calculation
    pop_pct = {"Freak": ".001%", "Legend": "0.01%", "Elite": "1%", "Expert": "5%", "Contender": "20%", "Challenger": "75%"}
    tier, next_tier, next_sec = "Challenger", "Contender", 60
    if total_sec >= 360: tier, next_tier = "Freak", ""
    elif total_sec >= 240: tier, next_tier, next_sec = "Legend", "Freak", 360
    elif total_sec >= 180: tier, next_tier, next_sec = "Elite", "Legend", 240
    elif total_sec >= 120: tier, next_tier, next_sec = "Expert", "Elite", 180
    elif total_sec >= 60: tier, next_tier, next_sec = "Contender", "Expert", 120
    
    # Tier colors - matches verified email
    tier_colors = {"Freak": "#8B5CF6", "Legend": "#D4AF37", "Elite": "#9CA3AF", "Expert": "#EF4444", "Contender": "#6B7280", "Challenger": "#10B981"}
    tier_color = tier_colors.get(tier, "#10B981")

    # Progress to next tier - accurate calculation
    tier_thresholds = {"Challenger": 0, "Contender": 60, "Expert": 120, "Elite": 180, "Legend": 240, "Freak": 360}
    current_tier_start = tier_thresholds.get(tier, 0)
    tier_range = next_sec - current_tier_start if next_sec else 60
    progress_pct = min(100, max(0, int(((total_sec - current_tier_start) / tier_range) * 100))) if tier_range > 0 else 0
    
    # Gap to next tier
    gap = next_sec - total_sec if next_sec else 0
    
    # Grip age
    grip_data = calculate_grip_age(dob, weight, gender, total_sec, height)
    grip_display = f"{grip_data['age']}" if not grip_data['isYouth'] else "18"
    
    # Fun facts based on tier
    fun_facts = {
        "Freak": "You can hang for 6+ minutes — that's longer than most people can hold their breath!",
        "Legend": "At 4 minutes, your grip strength predicts cardiovascular health better than blood pressure.",
        "Elite": "3 minutes of dead hangs can increase HGH by 30% — that's natural muscle-building!",
        "Expert": "2 minutes is where real tendon remodeling happens. You're building bulletproof joints.",
        "Contender": "You've broken 60 seconds — your spinal discs are getting real decompression benefits.",
        "Challenger": "Every second builds neural pathways. Consistency is your superpower."
    }
    fun_fact = fun_facts.get(tier, "Your grip strength is a predictor of longevity.")

    # PR celebration
    pr_block = ""
    if is_pr and prev_best:
        pr_block = f'''
        <div style="background: linear-gradient(135deg, #cc0000 0%, #ff4444 100%); border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 25px;">
            <p style="margin: 0; color: #fff; font-weight: bold; font-size: 20px;">NEW PERSONAL RECORD!</p>
            <p style="margin: 5px 0 0 0; color: #fff; opacity: 0.9; font-size: 14px;">Previous Best: {prev_best} — You're crushing it!</p>
        </div>'''

    # Portal link - uses tier color
    portal_button = ""
    if portal_token:
        verify_url = f"{APPS_SCRIPT_VERIFY_URL}?action=auth/verify&token={portal_token}"
        portal_button = f'''
        <div style="text-align: center; margin: 30px 0;">
          <a href="{verify_url}" style="background-color: {tier_color}; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block;">VIEW YOUR ATHLETE PORTAL</a>
          <p style="color: #666; font-size: 12px; margin-top: 10px;">Track your progress & unlock achievements</p>
        </div>'''

    # Progress bar to next tier
    progress_bar = ""
    if next_tier:
        progress_bar = f'''
        <div style="margin: 25px 0; padding: 20px; background: #f8f9fa; border-radius: 8px;">
            <p style="margin: 0 0 10px 0; color: #666; font-size: 13px; text-align: center;">PATH TO {next_tier.upper()}</p>
            <div style="background: #e9ecef; border-radius: 10px; height: 20px; overflow: hidden;">
                <div style="background: linear-gradient(90deg, {tier_color}, {tier_color}dd); width: {progress_pct}%; height: 100%; border-radius: 10px;"></div>
            </div>
            <p style="margin: 8px 0 0 0; color: #888; font-size: 12px; text-align: center;">{format_time(gap)} away from {next_tier} Tier</p>
        </div>'''

    html = f'''
    <div style="background-color: #000; padding: 40px 20px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #cc0000; padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; letter-spacing: 2px; font-size: 24px;">WORLD DEAD HANG</h1>
          <p style="color: #ffffff; margin: 5px 0 0 0; font-weight: bold; letter-spacing: 1px;">CHAMPIONSHIP</p>
        </div>
        <div style="padding: 40px 30px;">
          <h2 style="color: #000; margin-top: 0;">You're on the Leaderboard, {first_name}!</h2>
          <p style="color: #444; font-size: 16px; line-height: 1.6;">Your submission of <strong>{formatted_time}</strong> has been approved — you're now on the WDHC global leaderboard!</p>
          
          {pr_block}
          
          <div style="background-color: #f5f5f5; border-radius: 8px; padding: 25px; margin: 30px 0; text-align: center;">
            <p style="margin: 0; color: #888; text-transform: uppercase; font-size: 11px; font-weight: bold; letter-spacing: 1px;">Your Official Time</p>
            <h1 style="margin: 10px 0; color: #000; font-size: 52px; font-weight: bold;">{formatted_time}</h1>
            <div style="display: inline-block; background: {tier_color}; color: #fff; padding: 8px 20px; border-radius: 20px; font-weight: bold; font-size: 14px; text-transform: uppercase;">{tier} TIER</div>
            <p style="margin: 15px 0 0 0; color: #666; font-size: 14px;">Top {pop_pct[tier]} of all athletes worldwide</p>
          </div>
          
          {progress_bar}
          
          {portal_button}
          
          <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
          
          <!-- Grip Age - prominent display -->
          <div style="background: linear-gradient(135deg, #111 0%, #222 100%); border: 1px solid {tier_color}; padding: 24px; border-radius: 12px; text-align: center; margin-top: 25px;">
            <p style="margin: 0; color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">Grip Age</p>
            <p style="margin: 10px 0 0 0; color: #fff; font-size: 52px; font-weight: 700; line-height: 1;">{grip_display}</p>
            <p style="margin: 5px 0 0 0; color: #666; font-size: 12px;">years young</p>
          </div>
          
          <!-- Fun Fact -->
          <div style="background: #ffeaea; border-left: 4px solid #cc0000; padding: 15px 20px; border-radius: 0 8px 8px 0; margin: 20px 0;">
            <p style="margin: 0; color: #666; font-size: 13px; font-style: italic;">💡 {fun_fact}</p>
          </div>
          
          <p style="color: #444; font-size: 14px; line-height: 1.6; margin-top: 30px;">Your ranking is live on worlddeadhang.com!</p>
          
          <br><p style="color: #000; font-weight: bold; margin-bottom: 0;">- Milo</p><p style="color: #666; margin-top: 4px; font-size: 13px;">Founder, WDHC</p>
        </div>
        <div style="background-color: #f0f0f0; padding: 20px; text-align: center; border-top: 1px solid #ddd;">
          <p style="color: #888; font-size: 11px; margin: 0;">2026 World Dead Hang Championship. Stay gritty.</p>
        </div>
      </div>
    </div>
    '''
    return subject, html

# ============================================
# REJECTION EMAIL - Empathy + resubmit info
# ============================================
def get_rejection_email_html(a):
    """Email for athletes who failed video verification"""
    name, time_str = a['Name'], a['Time']
    total_sec = parse_time_to_seconds(time_str)
    formatted_time = format_time(total_sec)
    first_name = name.split(' ')[0]

    subject = f"Update on Your WDHC Submission, {first_name} - World Dead Hang Championship"

    html = f'''
    <div style="background-color: #000; padding: 40px 20px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #1a1a1a; padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; letter-spacing: 2px; font-size: 24px;">WORLD DEAD HANG</h1>
          <p style="color: #D4AF37; margin: 5px 0 0 0; font-weight: bold; letter-spacing: 1px;">CHAMPIONSHIP</p>
        </div>
        <div style="padding: 40px 30px;">
          <h2 style="color: #000; margin-top: 0;">Hey {first_name},</h2>
          <p style="color: #444; font-size: 16px; line-height: 1.6;">Thank you for submitting your hang time of <strong>{formatted_time}</strong> to the World Dead Hang Championship.</p>
          
          <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
            <p style="margin: 0; color: #856404; font-size: 14px; font-weight: bold;">Verification Update</p>
            <p style="margin: 10px 0 0 0; color: #856404; font-size: 14px;">After reviewing your submission, we were unable to verify your attempt according to our official rules.</p>
          </div>
          
          <p style="color: #444; font-size: 16px; line-height: 1.6;">This doesn't mean your effort doesn't count — it just means we need to see a clearer submission to include you on the verified leaderboard.</p>
          
          <h3 style="color: #000; margin-top: 30px;">How to Resubmit</h3>
          <ul style="color: #444; font-size: 14px; line-height: 1.8; padding-left: 20px;">
            <li>Film your full hang from start to finish</li>
            <li>Show a clear timer or clock in frame</li>
            <li>Ensure your grip is visible throughout</li>
            <li>Submit at: <a href="https://worlddeadhang.com/submit.html" style="color: #cc0000;">worlddeadhang.com/submit</a></li>
          </ul>
          
          <p style="color: #444; font-size: 14px; line-height: 1.6; margin-top: 30px;">We appreciate your commitment to grip strength. Every champion has to refine their craft — this is just part of your story.</p>
          
          <br><p style="color: #000; font-weight: bold; margin-bottom: 0;">- Milo</p><p style="color: #666; margin-top: 4px; font-size: 13px;">Founder, WDHC</p>
        </div>
          <div style="background-color: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #eee;">
            <p style="color: #aaa; font-size: 11px; margin: 0;">&copy; 2026 World Dead Hang Championship. Stay gritty.</p>
            <div style="margin-top: 15px;">
              <a href="https://worlddeadhang.com">
                <img src="https://worlddeadhang.com/assets/wdhc-logo-bronze-v2.png" alt="WDHC Logo" style="height: 40px; filter: drop-shadow(0 2px 10px rgba(0,0,0,0.5));">
              </a>
            </div>
          </div>
      </div>
    </div>
    '''
    return subject, html

def send_via_gmail(to, subject, html):
    try:
        creds = Credentials.from_authorized_user_file(GMAIL_TOKEN_PATH)
        service = build('gmail', 'v1', credentials=creds)
        message = MIMEText(html, 'html', 'utf-8')
        message['To'] = to
        message['Subject'] = Header(subject, 'utf-8')
        message['From'] = 'support@worlddeadhang.com'
        raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
        service.users().messages().send(userId='me', body={'raw': raw}).execute()
        return True, "Gmail Sent"
    except Exception as e: return False, f"Gmail Error: {str(e)}" 

def run_automation(test_mode=False):
    report = {"timestamp": datetime.now().isoformat(), "successes": [], "failures": []}
    creds_sa = service_account.Credentials.from_service_account_file(SERVICE_ACCOUNT_PATH)
    sheets_service = build('sheets', 'v4', credentials=creds_sa)
    res = sheets_service.spreadsheets().values().get(spreadsheetId=SPREADSHEET_ID, range="'Custom Form Submissions'!A1:W2000").execute()
    all_rows = res.get('values', [])
    if not all_rows: return report
    
    headers = all_rows[0]
    emailed_idx = -1
    for i, h in enumerate(headers):
        if h.strip() == "Emailed": emailed_idx = i
        if h.strip() == "Verified": verified_idx = i
    if emailed_idx == -1: return report

    # Vaulting
    with open(os.path.join(VAULT_DIR, f"wdhc_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"), 'w') as f:
        json.dump(all_rows, f)

    for i, row in enumerate(all_rows[1:]):
        curr_row = i + 2
        emailed_status = str(row[emailed_idx]).strip().lower() if len(row) > emailed_idx else ""
        if emailed_status in ["yes", "true"]: continue  # Always skip already emailed, even in test mode
        
        def g(idx): return str(row[idx]) if len(row) > idx else ""
        
        # Skip garbage rows (like our dummy row with name '1:00')
        athlete_name = g(2)
        athlete_email = g(3)
        if not athlete_name or not athlete_email or "@" not in athlete_email:
            continue

        athlete = sanitize_athlete({
            "Name": athlete_name, "Email": athlete_email, "DOB": g(6), 
            "Gender": g(7), "Weight": g(8), "Height": g(9),
            "Time": g(12), "IsPR": g(20), "PrevBest": g(21), "Verified": g(19) if verified_idx >= 0 else "No"
        })
        
        token = generate_token()
        # Create magic link
        link_record = [athlete['Email'], token, (datetime.now() + timedelta(hours=24)).isoformat(), "FALSE", athlete['Name'], "FALSE", datetime.now().isoformat()]
        sheets_service.spreadsheets().values().append(spreadsheetId=SPREADSHEET_ID, range="MagicLinks!A:G", valueInputOption="RAW", body={"values": [link_record]}).execute()

        # Only include portal link for verified/approved athletes
        is_verified = str(athlete.get('Verified', '')).strip().lower() == 'yes'
        portal_token_for_email = token if is_verified else None
        subj, html = get_html_template(athlete, portal_token=portal_token_for_email)
        target_email = "milobirk@gmail.com" if test_mode else athlete['Email']
        
        print(f"Processing row {curr_row}: {athlete['Name']} ({athlete['Email']})...")
        success, msg = send_via_gmail(target_email, subj, html)
        
        if success:
            report['successes'].append({"row": curr_row, "name": athlete['Name'], "method": msg})
            if not test_mode:
                col = chr(65 + emailed_idx)
                sheets_service.spreadsheets().values().update(spreadsheetId=SPREADSHEET_ID, range=f"'Custom Form Submissions'!{col}{curr_row}", valueInputOption="RAW", body={"values": [["Yes"]]}).execute()
        else:
            report['failures'].append({"row": curr_row, "name": athlete['Name'], "error": msg})

    # Save report
    report_filename = f"report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(os.path.join(REPORTS_DIR, report_filename), 'w') as f:
        json.dump(report, f)
    
    return report

if __name__ == "__main__":
    test = "--test" in sys.argv
    res = run_automation(test_mode=test)
    print(f"\nBatch Complete. Successes: {len(res['successes'])}, Failures: {len(res['failures'])}")
