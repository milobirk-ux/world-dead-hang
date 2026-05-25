     1|import os
     2|import json
     3|import base64
     4|import math
     5|import requests
     6|import sys
     7|import random
     8|import string
     9|from datetime import datetime, timedelta
    10|from email.mime.text import MIMEText
    11|from email.header import Header
    12|from googleapiclient.discovery import build
    13|from google.oauth2.credentials import Credentials
    14|from google.oauth2 import service_account
    15|
    16|# --- WDHC PRODUCTION EMAIL AUTOMATION V4.2 (BATCH AUTOMATION) ---
    17|# Combined V4.1 HTML/Normalization with V3.6 Batch/Reporting Logic.
    18|# FIXED: Absolute paths for reports and vault.
    19|
    20|GMAIL_TOKEN_PATH="/home/milobirk/.hermes/profiles/wdhc/google_token.json"
    21|SERVICE_ACCOUNT_PATH = "/home/milobirk/.hermes/.openclaw/credentials/google-service-account.json"
    22|SPREADSHEET_ID = "1qt-KNdOMareAl2Si6WRVAuTox7avV3gGAa7zdP6EW-s"
    23|APPS_SCRIPT_VERIFY_URL = "https://wdhc-portal.milobirk.workers.dev/api/auth/verify"
    24|VAULT_DIR = "/home/milobirk/.hermes/profiles/wdhc/Workspace/WDHC/production/vault"
    25|REPORTS_DIR = "/home/milobirk/.hermes/profiles/wdhc/Workspace/WDHC/production/reports"
    26|
    27|os.makedirs(VAULT_DIR, exist_ok=True)
    28|os.makedirs(REPORTS_DIR, exist_ok=True)
    29|
    30|# --- UTILS ---
    31|
    32|def generate_token(length=32):
    33|    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))
    34|
    35|def parse_time_to_seconds(time_str):
    36|    if not time_str: return 0
    37|    s = str(time_str).strip().replace('.', ':')
    38|    if ':' in s:
    39|        p = s.split(':')
    40|        if len(p) == 3: # MM:SS:CC
    41|            m, sec, c = p[0], p[1], p[2]
    42|            return (int(m) if m.isdigit() else 0) * 60 + (int(sec) if sec.isdigit() else 0)
    43|        elif len(p) == 2: # MM:SS
    44|            m, sec = p[0], p[1]
    45|            return (int(m) if m.isdigit() else 0) * 60 + (int(sec) if sec.isdigit() else 0)
    46|    try:
    47|        num = float(s)
    48|        if num < 30: return int(num * 60)
    49|        return int(num)
    50|    except: return 0
    51|
    52|def format_time(sec):
    53|    m = sec // 60
    54|    s = sec % 60
    55|    return f"{m}:{s:02d}" if m > 0 else f"{s}s"
    56|
    57|def sanitize_athlete(a):
    58|    a['Name'] = str(a.get('Name', '')).strip().title()
    59|    a['Email'] = str(a.get('Email', '')).strip().lower()
    60|    try:
    61|        w = str(a.get('Weight', '')).replace('lb', '').replace('lbs', '').strip()
    62|        a['Weight'] = float(w) if w else 175
    63|    except: a['Weight'] = 175
    64|    try:
    65|        h = str(a.get('Height', '')).replace('"', '').replace("'", '').strip()
    66|        a['Height'] = float(h) if h else 70
    67|    except: a['Height'] = 70
    68|    return a
    69|
    70|def get_tier_badge(tier):
    71|    styles = {
    72|        "Freak": "background: #9900ff; color: #fff;",
    73|        "Legend": "background: #D4AF37; color: #000;",
    74|        "Elite": "background: #E0E0E0; color: #000;",
    75|        "Expert": "background: #cc0000; color: #fff;",
    76|        "Contender": "border: 1px solid #666; color: #333;",
    77|        "Challenger": "border: 1px solid #1E8449; color: #1E8449;"
    78|    }
    79|    style = styles.get(tier, "background: #666; color: #fff;")
    80|    return f'<span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: bold; {style}">{tier.upper()}</span>'
    81|
    82|def calculate_grip_age(dob, weight, gender, actual_time, height):
    83|    chronological_age = 35
    84|    if dob:
    85|        try:
    86|            for fmt in ("%m/%d/%Y", "%Y-%m-%d", "%d/%m/%Y"):
    87|                try:
    88|                    birth_date = datetime.strptime(str(dob).strip(), fmt)
    89|                    today = datetime.now()
    90|                    chronological_age = (today - birth_date).days // 365
    91|                    break
    92|                except: continue
    93|        except: pass
    94|    is_female = 'female' in str(gender).lower()
    95|    if chronological_age <= 29: base_expected = 80 if is_female else 105
    96|    elif chronological_age <= 39: base_expected = 65 if is_female else 85
    97|    elif chronological_age <= 49: base_expected = 50 if is_female else 65
    98|    elif chronological_age <= 59: base_expected = 38 if is_female else 50
    99|    else: base_expected = 25 if is_female else 35
   100|    w_float, h_float = float(weight), float(height)
   101|    weight_adj = pow(((135 if is_female else 175) / max(1, w_float)), 0.7)
   102|    height_adj = pow((70 / max(1, h_float)), 0.5)
   103|    adj_expected = (base_expected * weight_adj * height_adj * 0.7) + (base_expected * 0.3)
   104|    performance_ratio = actual_time / max(1, adj_expected)
   105|    grip_age_raw = chronological_age - (math.log(max(0.1, performance_ratio)) * 20)
   106|    if chronological_age < 18: return {"age": "N/A (Youth)", "chronologicalAge": chronological_age, "isYouth": True}
   107|    return {"age": max(18, min(85, round(grip_age_raw))), "chronologicalAge": chronological_age, "isYouth": False}
   108|
   109|def get_html_template(a, portal_token=None):
   110|    name, time_str, dob, gender, weight, height = a['Name'], a['Time'], a['DOB'], a['Gender'], a['Weight'], a['Height']
   111|    total_sec = parse_time_to_seconds(time_str)
   112|    formatted_time = format_time(total_sec)
   113|    first_name = name.split(' ')[0]
   114|    is_pr = str(a.get('IsPR', '')).strip().lower() == 'yes'
   115|    prev_best = str(a.get('PrevBest', '')).strip()
   116|
   117|    is_verified = str(a.get('Verified', '')).strip().lower() == 'yes'
   118|    
   119|    if is_verified:
   120|        # APPROVAL EMAIL - they're now on the leaderboard!
   121|        subject = f"You're on the Leaderboard, {first_name}! - {formatted_time} - World Dead Hang Championship"
   122|        intro_sentence = f"Great news, {first_name}! Your submission has been verified and you're now officially on the WDHC global leaderboard. Welcome to the competition!"
   123|    elif not prev_best or prev_best.lower() in ['none', 'n/a', '', '0']:
   124|        # INITIAL SUBMISSION - under review, not on leaderboard yet
   125|        subject = f"Your WDHC Submission Received - Under Review - World Dead Hang Championship"
   126|        intro_sentence = f"Welcome to the community, {first_name}. Your submission of {formatted_time} has been received and is now under review. We'll verify your video and get back to you once approved!"
   127|    elif is_pr:
   128|        # PR SUBMISSION - under review (beat previous best)
   129|        subject = f"NEW PERSONAL RECORD! 🔥 {formatted_time} - {name} - World Dead Hang Championship"
   130|        intro_sentence = f"You're getting stronger, {first_name}. You just crushed your previous best of {prev_best} and set a new Personal Record. Your video is now under review - we'll verify it and get back to you once approved! Consistency is paying off."
   131|    else:
   132|        # RETURNING ATHLETE - under review (has prev_best, but not a PR)
   133|        subject = f"Another solid hang, {first_name} - {formatted_time} - World Dead Hang Championship"
   134|        intro_sentence = f"Consistency is where the real gains happen, {first_name}. While this wasn't a new PR today, you're logging the time and thickening those tendons. Your video is under review - we'll verify it and get back to you once approved!"
   135|
   136|    pop_pct = {"Freak": ".001%", "Legend": "0.01%", "Elite": "1%", "Expert": "5%", "Contender": "20%", "Challenger": "75%"}
   137|    tier, next_tier, next_sec, color = "Challenger", "Contender", 60, "#1E8449"
   138|    if total_sec >= 360: tier, next_tier, color = "Freak", "", "#9900ff"
   139|    elif total_sec >= 240: tier, next_tier, next_sec, color = "Legend", "Freak", 360, "#D4AF37"
   140|    elif total_sec >= 180: tier, next_tier, next_sec, color = "Elite", "Legend", 240, "#E0E0E0"
   141|    elif total_sec >= 120: tier, next_tier, next_sec, color = "Expert", "Elite", 180, "#cc0000"
   142|    elif total_sec >= 60: tier, next_tier, next_sec, color = "Contender", "Expert", 120, "#666666"
   143|    
   144|    if total_sec < 30: time_stat = "Every champion starts by conquering the first few seconds of gravity\u2014you've officially begun the process of re-wiring your central nervous system for elite grip strength."
   145|    elif total_sec < 45: time_stat = "Breaking the 30-second barrier means you've moved past simple grip and are now building the foundational tendon density required for true longevity."
   146|    elif total_sec < 60: time_stat = "Approaching the 60-second mark is where the real physiological shifts happen\u2014you're training your shoulders and spine to handle the weight of the world."
   147|    elif total_sec < 120: time_stat = "Passing the 1-minute threshold is a major longevity milestone; studies suggest this level of grip endurance is a primary indicator of a healthy, resilient heart."
   148|    elif total_sec < 180: time_stat = "A 2-minute hold proves your structural resilience\u2014you're effectively bulletproofing your joints and decompressing your spine with every second."
   149|    elif total_sec < 240: time_stat = "Holding for 3 minutes is a rare feat of grit; you've achieved a level of functional durability that places you in the upper echelon of dead-hang athletes."
   150|    elif total_sec < 360: time_stat = "Crossing into the 4-minute realm is a masterclass in mental and physical endurance\u2014this level of isometric strength is a superpower for long-term vitality."
   151|    else: time_stat = "6 minutes of pure hang time is a biological statement; you have developed a grip that is virtually unshakeable and a spirit that refuses to let go."
   152|    
   153|    if next_tier == "Contender": tier_benefit = f"Leveling up to Contender means you'll surpass the 1-minute mark and enter the top {pop_pct['Contender']} of the population."
   154|    elif next_tier == "Expert": tier_benefit = f"Reaching the Expert tier signifies a 2-minute hold, placing you in the top {pop_pct['Expert']} of human performance."
   155|    elif next_tier == "Elite": tier_benefit = f"Elite status (3 minutes) places you in the top {pop_pct['Elite']} of the community, demonstrating exceptional neurological grit."
   156|    elif next_tier == "Legend": tier_benefit = f"Becoming a Legend (4 minutes) means you've entered the top {pop_pct['Legend']} of humanity, where your grip is a primary indicator of elite-level health."
   157|    elif next_tier == "Freak": tier_benefit = f"The Freak tier (6+ minutes) is reserved for the absolute {pop_pct['Freak']} outliers. You're on the radar for Pro Class."
   158|    else: tier_benefit = f"You have reached the ultimate peak, belonging to the elite {pop_pct['Freak']} of athletes. You are qualified for consideration in our upcoming Pro Class."
   159|    
   160|    tier_badge, next_badge, gap = get_tier_badge(tier), get_tier_badge(next_tier) if next_tier else "", next_sec - total_sec
   161|    current_pop_pct = pop_pct[tier]
   162|    motivational_text = f"{time_stat} You're currently in the <strong>{tier_badge}</strong> tier (Top {current_pop_pct} of Population). You are only <strong>{format_time(gap)}</strong> away from {next_badge}. {tier_benefit}" if next_tier else f"{time_stat} <span style=\"color: {color}; font-weight: bold;\">{tier.upper()} TIER REACHED (Top {current_pop_pct} of Population).</span> {tier_benefit}"
   163|    
   164|    grip_data = calculate_grip_age(dob, weight, gender, total_sec, height)
   165|    if grip_data['isYouth']:
   166|        grip_display, personal_note = "Protected (Under 18)", "As a youth athlete, your focus should be on neurological adaptation and technique."
   167|    else:
   168|        grip_display = f"GripAge™: {grip_data['age']}"
   169|        age_diff = grip_data['chronologicalAge'] - grip_data['age']
   170|        if age_diff > 0: personal_note = f"Your GripAge™ is <strong>{age_diff} years younger</strong> than your chronological age. Your systemic health and neurological grit are outperforming your years."
   171|        elif age_diff < 0: personal_note = f"Your GripAge™ is currently higher than your chronological age. This indicates a massive opportunity for growth in tendon density and spinal health."
   172|        else: personal_note = f"Your GripAge™ perfectly matches your chronological age. You are meeting the baseline for your biological profile\u2014consistency will unlock the next level."
   173|
   174|    science_sections = [
   175|        {"title": "Spinal Decompression", "fact": "Dead hangs apply a natural traction to the spine. Just 60 seconds of hanging can create enough space between your vertebrae to allow nutrient-rich fluid to rehydrate your spinal discs, significantly reducing lower back pain and improving posture."},
   176|        {"title": "Longevity Marker", "fact": "Scientific studies (like the PURE study of 140,000 adults) show that grip strength is a more accurate predictor of cardiovascular health and all-cause mortality than systolic blood pressure. It is a fundamental proxy for your overall 'biological age'."}
   177|    ]
   178|    science_html = "".join([f'<div style="margin-bottom: 20px;"><p style="margin: 0; font-weight: bold; color: #333; font-size: 14px;">{s["title"]}</p><p style="margin: 5px 0 0 0; color: #666; font-size: 13px; line-height: 1.5;">{s["fact"]}</p></div>' for s in science_sections])
   179|
   180|    portal_button_html = ""
   181|    if portal_token:
   182|        verify_url = f"{APPS_SCRIPT_VERIFY_URL}?token={portal_token}"
   183|        portal_button_html = f'''
   184|        <div style="text-align: center; margin: 30px 0;">
   185|          <a href="{verify_url}" style="background-color: #D4AF37; color: #000; padding: 15px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 10px rgba(212,175,55,0.3);">LOGIN TO YOUR DASHBOARD</a>
   186|          <p style="color: #888; font-size: 12px; margin-top: 10px;">One-click access to your personalized stats and training logs.</p>
   187|        </div>
   188|        '''
   189|
   190|    html = f'''
   191|    <div style="background-color: #000; padding: 40px 20px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
   192|      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
   193|        <div style="background-color: #000; padding: 30px; text-align: center;">
   194|          <h1 style="color: #ffffff; margin: 0; letter-spacing: 2px; font-size: 24px;">WORLD DEAD HANG</h1>
   195|          <p style="color: #D4AF37; margin: 5px 0 0 0; font-weight: bold; letter-spacing: 1px;">CHAMPIONSHIP</p>
   196|        </div>
   197|        <div style="padding: 40px 30px;">
   198|          <h2 style="color: #000; margin-top: 0;">Nice work, {first_name}.</h2>
   199|          <p style="color: #444; font-size: 16px; line-height: 1.6;">{intro_sentence}</p>
   200|          <div style="background-color: #f9f9f9; border: 1px solid #eee; border-radius: 6px; padding: 25px; margin: 30px 0; text-align: center;">
   201|            <p style="margin: 0; color: #888; text-transform: uppercase; font-size: 12px; font-weight: bold; letter-spacing: 1px;">Official Hold Time</p>\n            <h1 style="margin: 5px 0; color: #000; font-size: 48px;">{formatted_time}</h1>
   202|            <div style="margin-top: 10px;">{tier_badge}</div>
   203|          </div>
   204|          <p style="color: #000; font-size: 16px; line-height: 1.6; text-align: center;">{motivational_text}</p>
   205|          {portal_button_html}
   206|          <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
   207|          <div style="background-color: #000; color: #fff; padding: 30px; border-radius: 8px; margin: 30px 0; text-align: center;">
   208|            <div style="margin-bottom: 20px;">
   209|              <h3 style="margin: 0; color: #D4AF37; text-transform: uppercase; letter-spacing: 2px; font-size: 28px;">{grip_display}</h3>
   210|              <p style="margin: 10px 0 0 0; color: #eee; font-size: 14px; line-height: 1.5;">{personal_note}</p>
   211|            </div>
   212|            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-top: 1px solid #333; padding-top: 20px;">
   213|              <tr>
   214|                <td align="center" width="33%"><p style="margin: 0; color: #888; font-size: 11px; text-transform: uppercase;">Weight</p><p style="margin: 5px 0 0 0; font-weight: bold; font-size: 18px;">{weight} lbs</p></td>
   215|                <td align="center" width="33%"><p style="margin: 0; color: #888; font-size: 11px; text-transform: uppercase;">Height</p><p style="margin: 5px 0 0 0; font-weight: bold; font-size: 18px;">{height}"</p></td>
   216|                <td align="center" width="33%"><p style="margin: 0; color: #888; font-size: 11px; text-transform: uppercase;">Age</p><p style="margin: 5px 0 0 0; font-weight: bold; font-size: 18px;">{grip_data['chronologicalAge']}</p></td>
   217|              </tr>
   218|            </table>
   219|          </div>
   220|          <h4 style="color: #000; text-transform: uppercase; font-size: 12px; letter-spacing: 1px; margin-bottom: 15px;">The Science of the Hang</h4>
   221|          {science_html}
   222|          <p style="color: #444; font-size: 14px; line-height: 1.6; margin-top: 30px;">Your ranking will be live on worlddeadhang.com within 24-48 hours once verified.</p>
   223|          <br><p style="color: #000; font-weight: bold; margin-bottom: 0;">Milo</p><p style="color: #666; margin-top: 4px; font-size: 13px;">Founder, WDHC</p>
   224|        </div>
   225|          <div style="background-color: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #eee;">
   226|            <p style="color: #aaa; font-size: 11px; margin: 0;">&copy; 2026 World Dead Hang Championship. Stay gritty.</p>
   227|            <div style="margin-top: 15px;">
   228|              <a href="https://worlddeadhang.com">
   229|                <img src="https://worlddeadhang.com/assets/wdhc-logo-bronze-v2.png" alt="WDHC Logo" style="height: 40px; filter: drop-shadow(0 2px 10px rgba(0,0,0,0.5));">
   230|              </a>
   231|            </div>
   232|          </div>
   233|      </div>
   234|    </div>
   235|    '''
   236|    return subject, html
   237|
   238|# ============================================
   239|# APPROVAL EMAIL - Verified + Checkmark (SPRUCED UP)
   240|# ============================================
   241|def get_approval_email_html(a, portal_token=None):
   242|    """Special email for verified/approved athletes - celebrates their leaderboard placement with gamification"""
   243|    name, time_str, dob, gender, weight, height = a['Name'], a['Time'], a['DOB'], a['Gender'], a['Weight'], a['Height']
   244|    total_sec = parse_time_to_seconds(time_str)
   245|    formatted_time = format_time(total_sec)
   246|    first_name = name.split(' ')[0]
   247|    is_pr = str(a.get('IsPR', '')).strip().lower() == 'yes'
   248|    prev_best = str(a.get('PrevBest', '')).strip()
   249|    country = a.get('Country', '')
   250|
   251|    # Approval subject - celebratory
   252|    if is_pr:
   253|        subject = f"NEW PERSONAL RECORD! {formatted_time} - You're on the Leaderboard, {first_name}! - World Dead Hang Championship"
   254|    else:
   255|        subject = f"You're on the Leaderboard, {first_name}! - WDHC Verified - World Dead Hang Championship"
   256|
   257|    # Tier calculation
   258|    pop_pct = {"Freak": ".001%", "Legend": "0.01%", "Elite": "1%", "Expert": "5%", "Contender": "20%", "Challenger": "75%"}
   259|    tier, next_tier, next_sec = "Challenger", "Contender", 60
   260|    if total_sec >= 360: tier, next_tier = "Freak", ""
   261|    elif total_sec >= 240: tier, next_tier, next_sec = "Legend", "Freak", 360
   262|    elif total_sec >= 180: tier, next_tier, next_sec = "Elite", "Legend", 240
   263|    elif total_sec >= 120: tier, next_tier, next_sec = "Expert", "Elite", 180
   264|    elif total_sec >= 60: tier, next_tier, next_sec = "Contender", "Expert", 120
   265|    
   266|    # Refined, bright yellow palette
   267|    tier_colors = {"Freak": "#8B5CF6", "Legend": "#D4AF37", "Elite": "#9CA3AF", "Expert": "#EF4444", "Contender": "#6B7280", "Challenger": "#10B981"}
   268|    tier_color = tier_colors.get(tier, "#10B981")
   269|
   270|    # Progress to next tier - accurate calculation
   271|    tier_thresholds = {"Challenger": 0, "Contender": 60, "Expert": 120, "Elite": 180, "Legend": 240, "Freak": 360}
   272|    current_tier_start = tier_thresholds.get(tier, 0)
   273|    tier_range = next_sec - current_tier_start if next_sec else 60
   274|    progress_pct = min(100, max(0, int(((total_sec - current_tier_start) / tier_range) * 100))) if tier_range > 0 else 0
   275|    
   276|    # Gap to next tier
   277|    gap = next_sec - total_sec if next_sec else 0
   278|    
   279|    # Grip age
   280|    grip_data = calculate_grip_age(dob, weight, gender, total_sec, height)
   281|    grip_display = f"{grip_data['age']}" if not grip_data['isYouth'] else "18"
   282|    
   283|    # Fun facts based on tier
   284|    fun_facts = {
   285|        "Freak": "You can hang for 6+ minutes — that's longer than most people can hold their breath!",
   286|        "Legend": "At 4 minutes, your grip strength predicts cardiovascular health better than blood pressure.",
   287|        "Elite": "3 minutes of dead hangs can increase HGH by 30% — that's natural muscle-building!",
   288|        "Expert": "2 minutes is where real tendon remodeling happens. You're building bulletproof joints.",
   289|        "Contender": "You've broken 60 seconds — your spinal discs are getting real decompression benefits.",
   290|        "Challenger": "Every second builds neural pathways. Consistency is your superpower."
   291|    }
   292|    fun_fact = fun_facts.get(tier, "Your grip strength is a predictor of longevity.")
   293|
   294|    # PR celebration block
   295|    pr_block = ""
   296|    if is_pr and prev_best:
   297|        pr_block = f'''
   298|        <div style="background: #1a1a1a; border: 1px solid #D4AF37; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 25px;">
   299|            <p style="margin: 0; color: #D4AF37; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">NEW PERSONAL RECORD</p>
   300|            <p style="margin: 8px 0 0 0; color: #fff; font-size: 24px; font-weight: bold;">{prev_best} → {formatted_time}</p>
   301|        </div>'''
   302|
   303|    # Portal link - uses tier color
   304|    portal_button = ""
   305|    if portal_token:
   306|        verify_url = f"{APPS_SCRIPT_VERIFY_URL}?token={portal_token}"
   307|        portal_button = f'''
   308|        <div style="text-align: center; margin: 30px 0;">
   309|          <a href="{verify_url}" style="background-color: {tier_color}; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block;">VIEW YOUR ATHLETE PORTAL</a>
   310|          <p style="color: #666; font-size: 12px; margin-top: 10px;">Track your progress & unlock achievements</p>
   311|        </div>'''
   312|
   313|    # Progress bar to next tier
   314|    progress_bar = ""
   315|    if next_tier:
   316|        progress_bar = f'''
   317|        <div style="margin: 25px 0; padding: 20px; background: #f8f9fa; border-radius: 8px;">
   318|            <p style="margin: 0 0 10px 0; color: #666; font-size: 12px; text-align: center; text-transform: uppercase; letter-spacing: 1px;">Next: {next_tier} Tier</p>
   319|            <div style="background: #e9ecef; border-radius: 4px; height: 8px; overflow: hidden;">
   320|                <div style="background: {tier_color}; width: {progress_pct}%; height: 100%;"></div>
   321|            </div>
   322|            <p style="margin: 8px 0 0 0; color: #888; font-size: 12px; text-align: center;">{format_time(gap)} to go</p>
   323|        </div>'''
   324|
   325|    html = f'''
   326|    <div style="background-color: #f5f5f5; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
   327|      <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
   328|        <!-- Header -->
   329|        <div style="background-color: #111; padding: 30px; text-align: center;">
   330|          <p style="color: #666; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 8px 0;">World Dead Hang</p>
   331|          <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 1px;">CHAMPIONSHIP</h1>
   332|        </div>
   333|        
   334|        <!-- Verified Badge -->
   335|        <div style="background: #D4AF37; padding: 24px; text-align: center;">
   336|          <span style="display: inline-block; color: #000; font-size: 28px; font-weight: 700; letter-spacing: 2px;">✓ VERIFIED</span>
   337|        </div>
   338|        
   339|        <!-- Body -->
   340|        <div style="padding: 30px;">
   341|          <h2 style="color: #111; margin: 0 0 15px 0; font-size: 24px; font-weight: 700;">You're in, {first_name}.</h2>
   342|          <p style="color: #555; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;">Your submission has been verified and you're now on the global leaderboard.</p>
   343|          
   344|          {pr_block}
   345|          
   346|          <!-- Time Card -->
   347|          <div style="background: #fafafa; border: 1px solid #e5e5e5; border-radius: 12px; padding: 25px; text-align: center; margin-bottom: 20px;">
   348|            <p style="margin: 0; color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Your Hang Time</p>
   349|            <p style="margin: 10px 0; color: #111; font-size: 48px; font-weight: 700; letter-spacing: -1px;">{formatted_time}</p>
   350|            <div style="display: inline-block; background: {tier_color}; color: #fff; padding: 6px 14px; border-radius: 16px; font-weight: 600; font-size: 12px; text-transform: uppercase;">{tier} Tier</div>
   351|            <p style="margin: 12px 0 0 0; color: #888; font-size: 13px;">Top {pop_pct[tier]} of athletes worldwide</p>
   352|          </div>
   353|          
   354|          {progress_bar}
   355|          
   356|          {portal_button}
   357|          
   358|          <!-- GripAge™ - prominent display -->
   359|          <div style="background: linear-gradient(135deg, #111 0%, #222 100%); border: 1px solid {tier_color}; padding: 24px; border-radius: 12px; text-align: center; margin-top: 25px;">
   360|            <p style="margin: 0; color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">GripAge™</p>
   361|            <p style="margin: 10px 0 0 0; color: #fff; font-size: 52px; font-weight: 700; line-height: 1;">{grip_display}</p>
   362|            <p style="margin: 5px 0 0 0; color: #666; font-size: 12px;">years young</p>
   363|          </div>
   364|          
   365|          <!-- Fun Fact -->
   366|          <div style="background: #fefce8; border-left: 3px solid #D4AF37; padding: 12px 15px; border-radius: 0 6px 6px 0; margin: 20px 0;">
   367|            <p style="margin: 0; color: #666; font-size: 13px; font-style: italic;">💡 {fun_fact}</p>
   368|          </div>
   369|          
   370|          <p style="color: #888; font-size: 13px; text-align: center; margin-top: 25px;">Your ranking is live at worlddeadhang.com</p>
   371|        </div>
   372|        
   373|        <!-- Footer -->
   374|        <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #eee;">
   375|          <p style="margin: 0; color: #999; font-size: 11px;">© 2026 World Dead Hang Championship</p>
   376|          <div style="margin-top: 15px;">
   377|            <a href="https://worlddeadhang.com">
   378|              <img src="https://worlddeadhang.com/assets/wdhc-logo-bronze-v2.png" alt="WDHC Logo" style="height: 40px; filter: drop-shadow(0 2px 10px rgba(0,0,0,0.5));">
   379|            </a>
   380|          </div>
   381|        </div>
   382|      </div>
   383|    </div>
   384|    '''
   385|    return subject, html
   386|
   387|# ============================================
   388|# APPROVED (No Checkmark) - Leaderboard but no video checkmark (SPRUCED UP)
   389|# ============================================
   390|def get_approved_no_checkmark_email_html(a, portal_token=None):
   391|    """Email for athletes on leaderboard but without video verification checkmark - spruced up"""
   392|    name, time_str, dob, gender, weight, height = a['Name'], a['Time'], a['DOB'], a['Gender'], a['Weight'], a['Height']
   393|    total_sec = parse_time_to_seconds(time_str)
   394|    formatted_time = format_time(total_sec)
   395|    first_name = name.split(' ')[0]
   396|    is_pr = str(a.get('IsPR', '')).strip().lower() == 'yes'
   397|    prev_best = str(a.get('PrevBest', '')).strip()
   398|
   399|    subject = f"You're on the Leaderboard, {first_name}! - WDHC"
   400|
   401|    # Tier calculation
   402|    pop_pct = {"Freak": ".001%", "Legend": "0.01%", "Elite": "1%", "Expert": "5%", "Contender": "20%", "Challenger": "75%"}
   403|    tier, next_tier, next_sec = "Challenger", "Contender", 60
   404|    if total_sec >= 360: tier, next_tier = "Freak", ""
   405|    elif total_sec >= 240: tier, next_tier, next_sec = "Legend", "Freak", 360
   406|    elif total_sec >= 180: tier, next_tier, next_sec = "Elite", "Legend", 240
   407|    elif total_sec >= 120: tier, next_tier, next_sec = "Expert", "Elite", 180
   408|    elif total_sec >= 60: tier, next_tier, next_sec = "Contender", "Expert", 120
   409|    
   410|    # Tier colors - matches verified email
   411|    tier_colors = {"Freak": "#8B5CF6", "Legend": "#D4AF37", "Elite": "#9CA3AF", "Expert": "#EF4444", "Contender": "#6B7280", "Challenger": "#10B981"}
   412|    tier_color = tier_colors.get(tier, "#10B981")
   413|
   414|    # Progress to next tier - accurate calculation
   415|    tier_thresholds = {"Challenger": 0, "Contender": 60, "Expert": 120, "Elite": 180, "Legend": 240, "Freak": 360}
   416|    current_tier_start = tier_thresholds.get(tier, 0)
   417|    tier_range = next_sec - current_tier_start if next_sec else 60
   418|    progress_pct = min(100, max(0, int(((total_sec - current_tier_start) / tier_range) * 100))) if tier_range > 0 else 0
   419|    
   420|    # Gap to next tier
   421|    gap = next_sec - total_sec if next_sec else 0
   422|    
   423|    # Grip age
   424|    grip_data = calculate_grip_age(dob, weight, gender, total_sec, height)
   425|    grip_display = f"{grip_data['age']}" if not grip_data['isYouth'] else "18"
   426|    
   427|    # Fun facts based on tier
   428|    fun_facts = {
   429|        "Freak": "You can hang for 6+ minutes — that's longer than most people can hold their breath!",
   430|        "Legend": "At 4 minutes, your grip strength predicts cardiovascular health better than blood pressure.",
   431|        "Elite": "3 minutes of dead hangs can increase HGH by 30% — that's natural muscle-building!",
   432|        "Expert": "2 minutes is where real tendon remodeling happens. You're building bulletproof joints.",
   433|        "Contender": "You've broken 60 seconds — your spinal discs are getting real decompression benefits.",
   434|        "Challenger": "Every second builds neural pathways. Consistency is your superpower."
   435|    }
   436|    fun_fact = fun_facts.get(tier, "Your grip strength is a predictor of longevity.")
   437|
   438|    # PR celebration
   439|    pr_block = ""
   440|    if is_pr and prev_best:
   441|        pr_block = f'''
   442|        <div style="background: linear-gradient(135deg, #cc0000 0%, #ff4444 100%); border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 25px;">
   443|            <p style="margin: 0; color: #fff; font-weight: bold; font-size: 20px;">NEW PERSONAL RECORD!</p>
   444|            <p style="margin: 5px 0 0 0; color: #fff; opacity: 0.9; font-size: 14px;">Previous Best: {prev_best} — You're crushing it!</p>
   445|        </div>'''
   446|
   447|    # Portal link - uses tier color
   448|    portal_button = ""
   449|    if portal_token:
   450|        verify_url = f"{APPS_SCRIPT_VERIFY_URL}?token={portal_token}"
   451|        portal_button = f'''
   452|        <div style="text-align: center; margin: 30px 0;">
   453|          <a href="{verify_url}" style="background-color: {tier_color}; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block;">VIEW YOUR ATHLETE PORTAL</a>
   454|          <p style="color: #666; font-size: 12px; margin-top: 10px;">Track your progress & unlock achievements</p>
   455|        </div>'''
   456|
   457|    # Progress bar to next tier
   458|    progress_bar = ""
   459|    if next_tier:
   460|        progress_bar = f'''
   461|        <div style="margin: 25px 0; padding: 20px; background: #f8f9fa; border-radius: 8px;">
   462|            <p style="margin: 0 0 10px 0; color: #666; font-size: 13px; text-align: center;">PATH TO {next_tier.upper()}</p>
   463|            <div style="background: #e9ecef; border-radius: 10px; height: 20px; overflow: hidden;">
   464|                <div style="background: linear-gradient(90deg, {tier_color}, {tier_color}dd); width: {progress_pct}%; height: 100%; border-radius: 10px;"></div>
   465|            </div>
   466|            <p style="margin: 8px 0 0 0; color: #888; font-size: 12px; text-align: center;">{format_time(gap)} away from {next_tier} Tier</p>
   467|        </div>'''
   468|
   469|    html = f'''
   470|    <div style="background-color: #000; padding: 40px 20px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
   471|      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
   472|        <div style="background-color: #cc0000; padding: 30px; text-align: center;">
   473|          <h1 style="color: #ffffff; margin: 0; letter-spacing: 2px; font-size: 24px;">WORLD DEAD HANG</h1>
   474|          <p style="color: #ffffff; margin: 5px 0 0 0; font-weight: bold; letter-spacing: 1px;">CHAMPIONSHIP</p>
   475|        </div>
   476|        <div style="padding: 40px 30px;">
   477|          <h2 style="color: #000; margin-top: 0;">You're on the Leaderboard, {first_name}!</h2>
   478|          <p style="color: #444; font-size: 16px; line-height: 1.6;">Your submission of <strong>{formatted_time}</strong> has been approved — you're now on the WDHC global leaderboard!</p>
   479|          
   480|          {pr_block}
   481|          
   482|          <div style="background-color: #f5f5f5; border-radius: 8px; padding: 25px; margin: 30px 0; text-align: center;">
   483|            <p style="margin: 0; color: #888; text-transform: uppercase; font-size: 11px; font-weight: bold; letter-spacing: 1px;">Your Official Time</p>
   484|            <h1 style="margin: 10px 0; color: #000; font-size: 52px; font-weight: bold;">{formatted_time}</h1>
   485|            <div style="display: inline-block; background: {tier_color}; color: #fff; padding: 8px 20px; border-radius: 20px; font-weight: bold; font-size: 14px; text-transform: uppercase;">{tier} TIER</div>
   486|            <p style="margin: 15px 0 0 0; color: #666; font-size: 14px;">Top {pop_pct[tier]} of all athletes worldwide</p>
   487|          </div>
   488|          
   489|          {progress_bar}
   490|          
   491|          {portal_button}
   492|          
   493|          <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
   494|          
   495|          <!-- GripAge™ - prominent display -->
   496|          <div style="background: linear-gradient(135deg, #111 0%, #222 100%); border: 1px solid {tier_color}; padding: 24px; border-radius: 12px; text-align: center; margin-top: 25px;">
   497|            <p style="margin: 0; color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">GripAge™</p>
   498|            <p style="margin: 10px 0 0 0; color: #fff; font-size: 52px; font-weight: 700; line-height: 1;">{grip_display}</p>
   499|            <p style="margin: 5px 0 0 0; color: #666; font-size: 12px;">years young</p>
   500|          </div>
   501|          
   502|          <!-- Fun Fact -->
   503|          <div style="background: #ffeaea; border-left: 4px solid #cc0000; padding: 15px 20px; border-radius: 0 8px 8px 0; margin: 20px 0;">
   504|            <p style="margin: 0; color: #666; font-size: 13px; font-style: italic;">💡 {fun_fact}</p>
   505|          </div>
   506|          
   507|          <p style="color: #444; font-size: 14px; line-height: 1.6; margin-top: 30px;">Your ranking is live on worlddeadhang.com!</p>
   508|          
   509|          <br><p style="color: #000; font-weight: bold; margin-bottom: 0;">- Milo</p><p style="color: #666; margin-top: 4px; font-size: 13px;">Founder, WDHC</p>
   510|        </div>
   511|        <div style="background-color: #f0f0f0; padding: 20px; text-align: center; border-top: 1px solid #ddd;">
   512|          <p style="color: #888; font-size: 11px; margin: 0;">2026 World Dead Hang Championship. Stay gritty.</p>
   513|        </div>
   514|      </div>
   515|    </div>
   516|    '''
   517|    return subject, html
   518|
   519|# ============================================
   520|# REJECTION EMAIL - Empathy + resubmit info
   521|# ============================================
   522|def get_rejection_email_html(a):
   523|    """Email for athletes who failed video verification"""
   524|    name, time_str = a['Name'], a['Time']
   525|    total_sec = parse_time_to_seconds(time_str)
   526|    formatted_time = format_time(total_sec)
   527|    first_name = name.split(' ')[0]
   528|
   529|    subject = f"Update on Your WDHC Submission, {first_name} - World Dead Hang Championship"
   530|
   531|    html = f'''
   532|    <div style="background-color: #000; padding: 40px 20px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
   533|      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
   534|        <div style="background-color: #1a1a1a; padding: 30px; text-align: center;">
   535|          <h1 style="color: #ffffff; margin: 0; letter-spacing: 2px; font-size: 24px;">WORLD DEAD HANG</h1>
   536|          <p style="color: #D4AF37; margin: 5px 0 0 0; font-weight: bold; letter-spacing: 1px;">CHAMPIONSHIP</p>
   537|        </div>
   538|        <div style="padding: 40px 30px;">
   539|          <h2 style="color: #000; margin-top: 0;">Hey {first_name},</h2>
   540|          <p style="color: #444; font-size: 16px; line-height: 1.6;">Thank you for submitting your hang time of <strong>{formatted_time}</strong> to the World Dead Hang Championship.</p>
   541|          
   542|          <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
   543|            <p style="margin: 0; color: #856404; font-size: 14px; font-weight: bold;">Verification Update</p>
   544|            <p style="margin: 10px 0 0 0; color: #856404; font-size: 14px;">After reviewing your submission, we were unable to verify your attempt according to our official rules.</p>
   545|          </div>
   546|          
   547|          <p style="color: #444; font-size: 16px; line-height: 1.6;">This doesn't mean your effort doesn't count — it just means we need to see a clearer submission to include you on the verified leaderboard.</p>
   548|          
   549|          <h3 style="color: #000; margin-top: 30px;">How to Resubmit</h3>
   550|          <ul style="color: #444; font-size: 14px; line-height: 1.8; padding-left: 20px;">
   551|            <li>Film your full hang from start to finish</li>
   552|            <li>Show a clear timer or clock in frame</li>
   553|            <li>Ensure your grip is visible throughout</li>
   554|            <li>Submit at: <a href="https://worlddeadhang.com/submit.html" style="color: #cc0000;">worlddeadhang.com/submit</a></li>
   555|          </ul>
   556|          
   557|          <p style="color: #444; font-size: 14px; line-height: 1.6; margin-top: 30px;">We appreciate your commitment to grip strength. Every champion has to refine their craft — this is just part of your story.</p>
   558|          
   559|          <br><p style="color: #000; font-weight: bold; margin-bottom: 0;">- Milo</p><p style="color: #666; margin-top: 4px; font-size: 13px;">Founder, WDHC</p>
   560|        </div>
   561|          <div style="background-color: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #eee;">
   562|            <p style="color: #aaa; font-size: 11px; margin: 0;">&copy; 2026 World Dead Hang Championship. Stay gritty.</p>
   563|            <div style="margin-top: 15px;">
   564|              <a href="https://worlddeadhang.com">
   565|                <img src="https://worlddeadhang.com/assets/wdhc-logo-bronze-v2.png" alt="WDHC Logo" style="height: 40px; filter: drop-shadow(0 2px 10px rgba(0,0,0,0.5));">
   566|              </a>
   567|            </div>
   568|          </div>
   569|      </div>
   570|    </div>
   571|    '''
   572|    return subject, html
   573|
   574|def send_via_gmail(to, subject, html):
   575|    try:
   576|        creds = Credentials.from_authorized_user_file(GMAIL_TOKEN_PATH)
   577|        service = build('gmail', 'v1', credentials=creds)
   578|        message = MIMEText(html, 'html', 'utf-8')
   579|        message['To'] = to
   580|        message['Subject'] = Header(subject, 'utf-8')
   581|        message['From'] = 'support@worlddeadhang.com'
   582|        raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
   583|        service.users().messages().send(userId='me', body={'raw': raw}).execute()
   584|        return True, "Gmail Sent"
   585|    except Exception as e: return False, f"Gmail Error: {str(e)}" 
   586|
   587|def run_automation(test_mode=False):
   588|    report = {"timestamp": datetime.now().isoformat(), "successes": [], "failures": []}
   589|    creds_sa = service_account.Credentials.from_service_account_file(SERVICE_ACCOUNT_PATH)
   590|    sheets_service = build('sheets', 'v4', credentials=creds_sa)
   591|    res = sheets_service.spreadsheets().values().get(spreadsheetId=SPREADSHEET_ID, range="'Custom Form Submissions'!A1:W2000").execute()
   592|    all_rows = res.get('values', [])
   593|    if not all_rows: return report
   594|    
   595|    headers = all_rows[0]
   596|    emailed_idx = -1
   597|    for i, h in enumerate(headers):
   598|        if h.strip() == "Emailed": emailed_idx = i
   599|        if h.strip() == "Verified": verified_idx = i
   600|    if emailed_idx == -1: return report
   601|
   602|    # Vaulting
   603|    with open(os.path.join(VAULT_DIR, f"wdhc_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"), 'w') as f:
   604|        json.dump(all_rows, f)
   605|
   606|    for i, row in enumerate(all_rows[1:]):
   607|        curr_row = i + 2
   608|        emailed_status = str(row[emailed_idx]).strip().lower() if len(row) > emailed_idx else ""
   609|        if emailed_status == "yes": continue  # Approval/denial already sent — skip entirely
   610|        
   611|        # Determine what email to send based on Verified status
   612|        verified_status = str(row[verified_idx]).strip().lower() if len(row) > verified_idx else "pending"
   613|        
   614|        # If Verified is still Pending and worker already sent confirmation, skip
   615|        if verified_status == "pending" and emailed_status == "confirm":
   616|            continue  # Worker sent confirmation, waiting for review — skip until Verified changes
   617|        
   618|        # Only process rows that have been reviewed (Verified == Yes or No)
   619|        if verified_status not in ["yes", "no"]:
   620|            continue  # Not yet reviewed — skip
   621|        
   622|        def g(idx): return str(row[idx]) if len(row) > idx else ""
   623|        
   624|        # Skip garbage rows (like our dummy row with name '1:00')
   625|        athlete_name = g(2)
   626|        athlete_email = g(5)  # Col F = Email Address
   627|        if not athlete_name or not athlete_email or "@" not in athlete_email:
   628|            continue
   629|
   630|        # Column mapping for current sheet layout (27 cols):
   631|        # C=2:Name, F=5:Email, I=8:DOB, J=9:Gender, K=10:Weight, L=11:Height,
   632|        # O=14:Official Time, T=19:Emailed, V=21:Verified, W=22:Is PR
   633|        # PrevBest not in sheet — leave empty
   634|        athlete = sanitize_athlete({
   635|            "Name": athlete_name, "Email": athlete_email, "DOB": g(8), 
   636|            "Gender": g(9), "Weight": g(10), "Height": g(11),
   637|            "Time": g(14), "IsPR": g(22), "PrevBest": "", "Verified": g(21) if verified_idx >= 0 else "No"
   638|        })
   639|        
   640|        token = generate_token()
   641|        # Create magic link
   642|        link_record = [athlete['Email'], token, (datetime.now() + timedelta(hours=24)).isoformat(), "FALSE", athlete['Name'], "FALSE", datetime.now().isoformat()]
   643|        sheets_service.spreadsheets().values().append(spreadsheetId=SPREADSHEET_ID, range="MagicLinks!A:G", valueInputOption="RAW", body={"values": [link_record]}).execute()
   644|
   645|        # Choose email template based on Verified status
   646|        is_verified = str(athlete.get('Verified', '')).strip().lower() == 'yes'
   647|        is_denied = str(athlete.get('Verified', '')).strip().lower() == 'no'
   648|        portal_token_for_email = token if is_verified else None
   649|        
   650|        if is_denied:
   651|            subj, html = get_rejection_email_html(athlete)
   652|        else:
   653|            subj, html = get_html_template(athlete, portal_token=portal_token_for_email)
   654|        target_email = "milobirk@gmail.com" if test_mode else athlete['Email']
   655|        
   656|        print(f"Processing row {curr_row}: {athlete['Name']} ({athlete['Email']})...")
   657|        success, msg = send_via_gmail(target_email, subj, html)
   658|        
   659|        if success:
   660|            report['successes'].append({"row": curr_row, "name": athlete['Name'], "method": msg})
   661|            if not test_mode:
   662|                # Mark Emailed = Yes so we don't re-send
   663|                col = chr(65 + emailed_idx)
   664|                sheets_service.spreadsheets().values().update(spreadsheetId=SPREADSHEET_ID, range=f"'Custom Form Submissions'!{col}{curr_row}", valueInputOption="RAW", body={"values": [["Yes"]]}).execute()
   665|                # Also mark Reviewed = Yes if not already
   666|                reviewed_idx_local = headers.index("Reviewed") if "Reviewed" in headers else -1
   667|                if reviewed_idx_local >= 0:
   668|                    reviewed_col = chr(65 + reviewed_idx_local)
   669|                    sheets_service.spreadsheets().values().update(spreadsheetId=SPREADSHEET_ID, range=f"'Custom Form Submissions'!{reviewed_col}{curr_row}", valueInputOption="RAW", body={"values": [["Yes"]]}).execute()
   670|        else:
   671|            report['failures'].append({"row": curr_row, "name": athlete['Name'], "error": msg})
   672|
   673|    # Save report
   674|    report_filename = f"report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
   675|    with open(os.path.join(REPORTS_DIR, report_filename), 'w') as f:
   676|        json.dump(report, f)
   677|    
   678|    # Trigger leaderboard sync if any emails were sent
   679|    if report['successes'] and not test_mode:
   680|        import subprocess
   681|        sync_script = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'development_scripts', 'sync_inline_athletes.js')
   682|        if os.path.exists(sync_script):
   683|            print(f'Running leaderboard sync for {len(report["successes"])} approved athlete(s)...')
   684|            try:
   685|                result = subprocess.run(['node', sync_script], capture_output=True, text=True, timeout=120)
   686|                if result.returncode == 0:
   687|                    print('Leaderboard sync complete.')
   688|                else:
   689|                    print(f'Sync error: {result.stderr[:200]}')
   690|            except Exception as e:
   691|                print(f'Sync failed: {e}')
   692|    
   693|    return report
   694|
   695|if __name__ == "__main__":
   696|    test = "--test" in sys.argv
   697|    res = run_automation(test_mode=test)
   698|    print(f"\nBatch Complete. Successes: {len(res['successes'])}, Failures: {len(res['failures'])}")
   699|