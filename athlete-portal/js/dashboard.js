     1|// WDHC Athlete Portal Dashboard v2.0
     2|// Uses Cloudflare Worker portal API (no GAS dependency)
     3|
     4|async function initDashboard() {
     5|    try {
     6|        const res = await apiRequest('GET', 'athlete/profile');
     7|
     8|        if (res && (res.success || res.data)) {
     9|            const a = res.data || res.profile;
    10|
    11|            if (a.email) {
    12|                localStorage.setItem('wdhc_athlete_email', a.email.toLowerCase());
    13|                localStorage.setItem('wdhc_athlete_data', encodeURIComponent(JSON.stringify(a)));
    14|            }
    15|
    16|            const displayName = a.displayName || a.name || 'Athlete';
    17|            const fullName = a.name || 'Athlete';
    18|            document.getElementById('userName').textContent = displayName;
    19|            document.getElementById('sidebarUserName').textContent = fullName;
    20|
    21|            const rank = a.rank || '--';
    22|            document.getElementById('sidebarUserRank').textContent = 'Rank: #' + rank;
    23|            document.getElementById('currentRank').textContent = '#' + rank;
    24|
    25|            const bestTime = a.bestHangTime || '0:00';
    26|            document.getElementById('bestHang').textContent = bestTime;
    27|            document.getElementById('sidebarBestHang').textContent = bestTime;
    28|
    29|            const totalSubs = a.totalSubmissions !== undefined ? a.totalSubmissions : (a.totalPRs || '0');
    30|            document.getElementById('totalPRs').textContent = totalSubs;
    31|
    32|            const gripAge = a.gripAge || '--';
    33|            const ageDisplay = isNaN(gripAge) ? gripAge : gripAge + ' yrs';
    34|            document.getElementById('gripAge').textContent = ageDisplay;
    35|            document.getElementById('sidebarGripAge').textContent = ageDisplay;
    36|
    37|            document.getElementById('welcomeTitle').textContent = 'Welcome back, ' + displayName + '!';
    38|
    39|            renderEnhancedStats(a);
    40|            renderPRStreak(a);
    41|            if (a.history && a.history.length > 0) renderHangHistory(a.history);
    42|            updatePRButton();
    43|            renderShareButton(a);
    44|            renderEditProfileBtn();
    45|
    46|            document.body.classList.add('data-loaded');
    47|            console.log('Dashboard Data Synced v2.1');
    48|        }
    49|    } catch (e) {
    50|        console.error('Dash Error:', e);
    51|    }
    52|}
    53|
    54|function renderEnhancedStats(a) {
    55|    let extraSection = document.getElementById('extraStatsSection');
    56|    if (!extraSection) {
    57|        const content = document.querySelector('.dashboard-content');
    58|        if (!content) return;
    59|        const statsGrid = document.querySelector('.stats-grid');
    60|        if (!statsGrid) return;
    61|        extraSection = document.createElement('div');
    62|        extraSection.id = 'extraStatsSection';
    63|        extraSection.style.cssText = 'margin-top:30px;padding:25px;background:var(--secondary-light);border-radius:8px;border:1px solid var(--gray-800);';
    64|        statsGrid.parentNode.insertBefore(extraSection, statsGrid.nextSibling);
    65|    }
    66|
    67|    const yearsSaved = a.yearsSaved !== null && a.yearsSaved !== undefined
    68|        ? (a.yearsSaved > 0 ? a.yearsSaved + ' years younger' : Math.abs(a.yearsSaved) + ' years older') : '';
    69|    const tierBadge = a.tier ? `<span style="display:inline-block;padding:3px 10px;background:${a.tierColor || '#D4AF37'};color:${a.tierColor === '#D4AF37' || a.tierColor === '#E0E0E0' || a.tierColor === '#A0A0A0' ? '#000' : '#fff'};font-weight:bold;border-radius:4px;font-size:0.85rem;">${a.tier} Tier</span>` : '';
    70|    const nextTierGap = a.nextTierGap ? `<span style="color:var(--gray-500);font-size:0.85rem;">${a.nextTierGap} to ${a.nextTier}</span>` : '';
    71|    const consistencyScore = a.consistencyScore !== null ? `<div style="text-align:center;"><p style="margin:0;color:var(--gray-500);font-size:0.75rem;text-transform:uppercase;">Consistency</p><p style="margin:4px 0 0 0;font-size:1.5rem;font-weight:bold;color:var(--gold);">${a.consistencyScore}%</p></div>` : '';
    72|    const percentileRank = a.percentileByAgeGender !== null ? `<div style="text-align:center;"><p style="margin:0;color:var(--gray-500);font-size:0.75rem;text-transform:uppercase;">Percentile (Age/Gender)</p><p style="margin:4px 0 0 0;font-size:1.5rem;font-weight:bold;color:var(--gold);">Top ${a.percentileByAgeGender}%</p></div>` : '';
    73|    const daysSince = a.daysSinceLastSubmission !== null ? `<div style="text-align:center;"><p style="margin:0;color:var(--gray-500);font-size:0.75rem;text-transform:uppercase;">Last Hang</p><p style="margin:4px 0 0 0;font-size:1.5rem;font-weight:bold;color:var(--gold);">${a.daysSinceLastSubmission}d ago</p></div>` : '';
    74|
    75|    extraSection.innerHTML = `
    76|        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:10px;">
    77|            <div>
    78|                <h3 style="color:var(--gold);font-family:Oswald;margin:0;font-size:1.2rem;">ATHLETE PROFILE</h3>
    79|                <p style="margin:4px 0 0 0;color:var(--gray-500);font-size:0.8rem;">
    80|                    ${a.gripTraining ? 'Training: ' + a.gripTraining : ''}
    81|                    ${a.weight ? ' · ' + a.weight + ' lbs' : ''}
    82|                    ${a.height ? ' · ' + a.height + '"' : ''}
    83|                    ${a.gender ? ' · ' + a.gender : ''}
    84|                </p>
    85|            </div>
    86|            <div style="display:flex;align-items:center;gap:10px;">${tierBadge}${nextTierGap}</div>
    87|        </div>
    88|        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:15px;">
    89|            <div style="text-align:center;"><p style="margin:0;color:var(--gray-500);font-size:0.75rem;text-transform:uppercase;">Chronological Age</p><p style="margin:4px 0 0 0;font-size:1.5rem;font-weight:bold;color:#fff;">${a.chronologicalAge || '—'}</p></div>
    90|            <div style="text-align:center;"><p style="margin:0;color:var(--gray-500);font-size:0.75rem;text-transform:uppercase;">GripAge™</p><p style="margin:4px 0 0 0;font-size:1.5rem;font-weight:bold;color:var(--gold);">${isNaN(gripAge) ? gripAge : gripAge + ' yrs'}</p></div>
    91|            <div style="text-align:center;"><p style="margin:0;color:var(--gray-500);font-size:0.75rem;text-transform:uppercase;">Years Saved</p><p style="margin:4px 0 0 0;font-size:1.5rem;font-weight:bold;color:${a.yearsSaved > 0 ? '#4CAF50' : '#ff5722'};">${yearsSaved || '—'}</p></div>
    92|            ${consistencyScore}${percentileRank}${daysSince}
    93|        </div>
    94|    `;
    95|}
    96|
    97|function renderHangHistory(history) {
    98|    let historySection = document.getElementById('hangHistorySection');
    99|    if (!historySection) {
   100|        const content = document.querySelector('.dashboard-content');
   101|        if (!content) return;
   102|        historySection = document.createElement('div');
   103|        historySection.id = 'hangHistorySection';
   104|        historySection.style.cssText = 'margin-top:30px;padding:25px;background:var(--secondary-light);border-radius:8px;border:1px solid var(--gray-800);';
   105|        content.appendChild(historySection);
   106|    }
   107|    const rows = history.map(h => `
   108|        <tr style="border-bottom:1px solid var(--gray-800);">
   109|            <td style="padding:10px;color:#fff;font-family:'Roboto Mono',monospace;">${h.time}</td>
   110|            <td style="padding:10px;color:var(--gray-500);font-size:0.85rem;">${h.date || '—'}</td>
   111|            <td style="padding:10px;text-align:center;">${h.isPR ? '<span style="color:var(--gold);font-weight:bold;font-size:0.75rem;">PR</span>' : ''}</td>
   112|            <td style="padding:10px;text-align:center;">${h.verified ? '<span style="color:#4CAF50;font-size:0.75rem;">✓</span>' : '<span style="color:var(--gray-600);font-size:0.75rem;">Pending</span>'}</td>
   113|        </tr>
   114|    `).join('');
   115|    historySection.innerHTML = `
   116|        <h3 style="color:var(--gold);font-family:Oswald;margin:0 0 15px 0;font-size:1.2rem;">HANG HISTORY</h3>
   117|        <table style="width:100%;border-collapse:collapse;">
   118|            <thead><tr style="border-bottom:2px solid var(--gray-700);">
   119|                <th style="padding:8px;text-align:left;color:var(--gray-500);font-size:0.75rem;text-transform:uppercase;">Time</th>
   120|                <th style="padding:8px;text-align:left;color:var(--gray-500);font-size:0.75rem;text-transform:uppercase;">Date</th>
   121|                <th style="padding:8px;text-align:center;color:var(--gray-500);font-size:0.75rem;text-transform:uppercase;">PR</th>
   122|                <th style="padding:8px;text-align:center;color:var(--gray-500);font-size:0.75rem;text-transform:uppercase;">Verified</th>
   123|            </tr></thead>
   124|            <tbody>${rows}</tbody>
   125|        </table>
   126|    `;
   127|}
   128|
   129|function updatePRButton() {
   130|    const prBtn = document.querySelector('a[href*="submit.html"]');
   131|    if (!prBtn) return;
   132|    prBtn.removeAttribute('href');
   133|    prBtn.onclick = function(e) { e.preventDefault(); showSubmitHangModal(); };
   134|}
   135|
   136|function showSubmitHangModal() {
   137|    const existing = document.getElementById('submitHangModal');
   138|    if (existing) existing.remove();
   139|
   140|    const modal = document.createElement('div');
   141|    modal.id = 'submitHangModal';
   142|    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:1000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
   143|    modal.innerHTML = `
   144|        <div style="background:#111;border:1px solid var(--gray-800);border-radius:12px;padding:30px;max-width:500px;width:90%;position:relative;max-height:90vh;overflow-y:auto;">
   145|            <button onclick="document.getElementById('submitHangModal').remove()" style="position:absolute;top:15px;right:15px;background:none;border:none;color:var(--gray-500);font-size:1.5rem;cursor:pointer;">&times;</button>
   146|            <h2 style="color:var(--gold);font-family:Oswald;margin:0 0 5px 0;">+ NEW HANG</h2>
   147|            <p style="color:var(--gray-500);font-size:0.85rem;margin:0 0 25px 0;">Submit a new hang time. Your profile data is pre-filled.</p>
   148|            <div id="submitHangErrors" style="display:none;margin-bottom:15px;padding:12px;background:#ff572222;border:1px solid #ff5722;border-radius:6px;color:#ff5722;font-size:0.85rem;"></div>
   149|            <form id="submitHangForm" onsubmit="return handleHangSubmit(event)">
   150|                <div style="margin-bottom:18px;">
   151|                    <label style="display:block;color:var(--gray-400);font-size:0.8rem;text-transform:uppercase;margin-bottom:6px;">Hang Time <span style="color:#ff5722;">*</span></label>
   152|                    <div style="display:flex;gap:10px;align-items:center;">
   153|                        <input type="number" id="hangMinutes" min="0" max="20" value="0" style="width:70px;padding:10px;background:#0a0a0a;border:1px solid var(--gray-700);border-radius:6px;color:#fff;font-size:1.2rem;text-align:center;font-family:'Roboto Mono',monospace;">
   154|                        <span style="color:var(--gray-600);font-size:1.5rem;">:</span>
   155|                        <input type="number" id="hangSeconds" min="0" max="59" value="0" style="width:70px;padding:10px;background:#0a0a0a;border:1px solid var(--gray-700);border-radius:6px;color:#fff;font-size:1.2rem;text-align:center;font-family:'Roboto Mono',monospace;">
   156|                        <span style="color:var(--gray-600);font-size:0.75rem;text-transform:uppercase;">MM:SS</span>
   157|                    </div>
   158|                </div>
   159|                <div style="margin-bottom:18px;">
   160|                    <label style="display:block;color:var(--gray-400);font-size:0.8rem;text-transform:uppercase;margin-bottom:6px;">Video URL</label>
   161|                    <input type="url" id="hangVideoUrl" placeholder="https://youtube.com/watch?v=..." style="width:100%;padding:10px;background:#0a0a0a;border:1px solid var(--gray-700);border-radius:6px;color:#fff;font-size:0.95rem;">
   162|                </div>
   163|                <div style="margin-bottom:18px;">
   164|                    <label style="display:block;color:var(--gray-400);font-size:0.8rem;text-transform:uppercase;margin-bottom:6px;">Date of Attempt</label>
   165|                    <input type="date" id="hangAttemptDate" style="width:100%;padding:10px;background:#0a0a0a;border:1px solid var(--gray-700);border-radius:6px;color:#fff;font-size:0.95rem;">
   166|                </div>
   167|                <div style="margin-bottom:25px;">
   168|                    <label style="display:block;color:var(--gray-400);font-size:0.8rem;text-transform:uppercase;margin-bottom:6px;">Notes</label>
   169|                    <textarea id="hangNotes" rows="2" placeholder="Optional notes..." style="width:100%;padding:10px;background:#0a0a0a;border:1px solid var(--gray-700);border-radius:6px;color:#fff;font-size:0.95rem;resize:vertical;"></textarea>
   170|                </div>
   171|                <button type="submit" id="submitHangBtn" style="width:100%;padding:14px;background:var(--gold);color:#000;border:none;border-radius:6px;font-weight:bold;font-size:1rem;cursor:pointer;text-transform:uppercase;">Submit Hang</button>
   172|            </form>
   173|            <div id="submitHangSuccess" style="display:none;text-align:center;padding:30px 0;">
   174|                <div style="font-size:3rem;margin-bottom:15px;">&#10003;</div>
   175|                <h3 style="color:var(--gold);font-family:Oswald;margin:0 0 10px 0;">Hang Submitted!</h3>
   176|                <p style="color:var(--gray-500);font-size:0.9rem;margin:0 0 20px 0;">Check your email for confirmation. Your time will be reviewed within 24-48 hours.</p>
   177|                <button onclick="document.getElementById('submitHangModal').remove(); initDashboard();" style="padding:10px 25px;background:var(--gray-800);color:#fff;border:none;border-radius:6px;font-weight:bold;cursor:pointer;">Close</button>
   178|            </div>
   179|        </div>
   180|    `;
   181|    document.body.appendChild(modal);
   182|    const dateInput = document.getElementById('hangAttemptDate');
   183|    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
   184|}
   185|
   186|async function handleHangSubmit(e) {
   187|    e.preventDefault();
   188|    const btn = document.getElementById('submitHangBtn');
   189|    const errors = document.getElementById('submitHangErrors');
   190|    const form = document.getElementById('submitHangForm');
   191|    const success = document.getElementById('submitHangSuccess');
   192|    const minutes = parseInt(document.getElementById('hangMinutes').value) || 0;
   193|    const seconds = parseInt(document.getElementById('hangSeconds').value) || 0;
   194|    if (minutes === 0 && seconds === 0) { errors.style.display = 'block'; errors.textContent = 'Please enter a hang time.'; return false; }
   195|    const hangTime = minutes + ':' + seconds.toString().padStart(2, '0');
   196|    btn.disabled = true; btn.textContent = 'Submitting...'; errors.style.display = 'none';
   197|    try {
   198|        const result = await WDHC_API.submitHang(hangTime, document.getElementById('hangVideoUrl').value.trim(), document.getElementById('hangAttemptDate').value, document.getElementById('hangNotes').value.trim());
   199|        if (result.success) { form.style.display = 'none'; success.style.display = 'block'; }
   200|        else { errors.style.display = 'block'; errors.textContent = result.error || 'Submission failed.'; btn.disabled = false; btn.textContent = 'Submit Hang'; }
   201|    } catch(err) { errors.style.display = 'block'; errors.textContent = 'Network error. Please try again.'; btn.disabled = false; btn.textContent = 'Submit Hang'; }
   202|    return false;
   203|}
   204|
   205|document.addEventListener('DOMContentLoaded', initDashboard);
   206|
   207|// ===== PR STREAK BADGE =====
   208|function renderPRStreak(a) {
   209|  if (!a.prStreak && !a.monthlyStreak) return;
   210|  let streakSection = document.getElementById('streakSection');
   211|  if (!streakSection) {
   212|    const content = document.querySelector('.dashboard-content');
   213|    if (!content) return;
   214|    streakSection = document.createElement('div');
   215|    streakSection.id = 'streakSection';
   216|    streakSection.style.cssText = 'margin-top:20px;padding:20px;background:linear-gradient(135deg,#1a1a2e,#16213e);border-radius:8px;border:1px solid #D4AF3733;text-align:center;';
   217|    content.insertBefore(streakSection, content.firstChild.nextSibling);
   218|  }
   219|  const badges = [];
   220|  if (a.prStreak >= 2) badges.push(`🔥 ${a.prStreak} PR Streak`);
   221|  if (a.monthlyStreak >= 3) badges.push(`⚡ ${a.monthlyStreak} Hangs This Month`);
   222|  else if (a.monthlyStreak >= 1) badges.push(`📅 ${a.monthlyStreak} This Month`);
   223|  streakSection.innerHTML = badges.length ? `<p style="margin:0;color:var(--gold);font-size:0.95rem;font-weight:bold;">${badges.join(' · ')}</p>` : '';
   224|}
   225|
   226|// ===== EDIT PROFILE =====
   227|function renderEditProfileBtn() {
   228|  const sidebar = document.querySelector('.sidebar-footer');
   229|  if (!sidebar) return;
   230|  if (document.getElementById('editProfileBtn')) return;
   231|  const btn = document.createElement('button');
   232|  btn.id = 'editProfileBtn';
   233|  btn.textContent = '✎ Edit Profile';
   234|  btn.style.cssText = 'width:100%;padding:10px;margin-top:10px;background:transparent;border:1px solid var(--gray-700);border-radius:6px;color:var(--gray-500);font-size:0.85rem;cursor:pointer;transition:all 0.2s;';
   235|  btn.onmouseover = () => { btn.style.borderColor = 'var(--gold)'; btn.style.color = 'var(--gold)'; };
   236|  btn.onmouseout = () => { btn.style.borderColor = 'var(--gray-700)'; btn.style.color = 'var(--gray-500)'; };
   237|  btn.onclick = showEditProfileModal;
   238|  sidebar.insertBefore(btn, sidebar.firstChild);
   239|}
   240|
   241|function showEditProfileModal() {
   242|  const existing = document.getElementById('editProfileModal');
   243|  if (existing) existing.remove();
   244|  const cached = localStorage.getItem('wdhc_athlete_data');
   245|  let data = {}; if (cached) { try { data = JSON.parse(decodeURIComponent(cached)); } catch(e) {} }
   246|  const modal = document.createElement('div');
   247|  modal.id = 'editProfileModal';
   248|  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:1000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
   249|  modal.innerHTML = `
   250|    <div style="background:#111;border:1px solid var(--gray-800);border-radius:12px;padding:30px;max-width:400px;width:90%;position:relative;">
   251|      <button onclick="document.getElementById('editProfileModal').remove()" style="position:absolute;top:15px;right:15px;background:none;border:none;color:var(--gray-500);font-size:1.5rem;cursor:pointer;">&times;</button>
   252|      <h2 style="color:var(--gold);font-family:Oswald;margin:0 0 20px 0;">EDIT PROFILE</h2>
   253|      <div id="editProfileErrors" style="display:none;margin-bottom:15px;padding:10px;background:#ff572222;border-radius:6px;color:#ff5722;font-size:0.85rem;"></div>
   254|      <form id="editProfileForm" onsubmit="return handleProfileUpdate(event)">
   255|        <div style="margin-bottom:15px;">
   256|          <label style="display:block;color:var(--gray-400);font-size:0.8rem;text-transform:uppercase;margin-bottom:6px;">Weight (lbs)</label>
   257|          <input type="number" id="editWeight" value="${data.weight || ''}" step="0.1" style="width:100%;padding:10px;background:#0a0a0a;border:1px solid var(--gray-700);border-radius:6px;color:#fff;">
   258|        </div>
   259|        <div style="margin-bottom:15px;">
   260|          <label style="display:block;color:var(--gray-400);font-size:0.8rem;text-transform:uppercase;margin-bottom:6px;">Height (inches)</label>
   261|          <input type="number" id="editHeight" value="${data.height || ''}" step="0.1" style="width:100%;padding:10px;background:#0a0a0a;border:1px solid var(--gray-700);border-radius:6px;color:#fff;">
   262|        </div>
   263|        <div style="margin-bottom:20px;">
   264|          <label style="display:block;color:var(--gray-400);font-size:0.8rem;text-transform:uppercase;margin-bottom:6px;">Grip Training</label>
   265|          <select id="editTraining" style="width:100%;padding:10px;background:#0a0a0a;border:1px solid var(--gray-700);border-radius:6px;color:#fff;">
   266|            <option value="None" ${data.gripTraining === 'None' ? 'selected' : ''}>None</option>
   267|            <option value="Beginner" ${data.gripTraining === 'Beginner' ? 'selected' : ''}>Beginner (&lt;6 mo)</option>
   268|            <option value="Intermediate" ${data.gripTraining === 'Intermediate' ? 'selected' : ''}>Intermediate (6 mo - 2 yr)</option>
   269|            <option value="Advanced" ${data.gripTraining === 'Advanced' ? 'selected' : ''}>Advanced (2+ yr)</option>
   270|          </select>
   271|        </div>
   272|        <button type="submit" id="editProfileSubmit" style="width:100%;padding:12px;background:var(--gold);color:#000;border:none;border-radius:6px;font-weight:bold;cursor:pointer;">Save Changes</button>
   273|      </form>
   274|    </div>`;
   275|  document.body.appendChild(modal);
   276|}
   277|
   278|async function handleProfileUpdate(e) {
   279|  e.preventDefault();
   280|  const btn = document.getElementById('editProfileSubmit');
   281|  const errors = document.getElementById('editProfileErrors');
   282|  btn.disabled = true; btn.textContent = 'Saving...'; errors.style.display = 'none';
   283|  try {
   284|    const res = await fetch(`${WDHC_API.CONFIG.BASE_URL}/athlete/update-profile?token=${getSessionToken()}`, {
   285|      method: 'POST', headers: { 'Content-Type': 'application/json' },
   286|      body: JSON.stringify({
   287|        weight: document.getElementById('editWeight').value,
   288|        height: document.getElementById('editHeight').value,
   289|        gripTraining: document.getElementById('editTraining').value,
   290|      })
   291|    });
   292|    const data = await res.json();
   293|    if (data.success) {
   294|      localStorage.removeItem('wdhc_athlete_data');
   295|      document.getElementById('editProfileModal').remove();
   296|      initDashboard();
   297|    } else {
   298|      errors.style.display = 'block';
   299|      errors.textContent = data.error || 'Update failed.';
   300|      btn.disabled = false; btn.textContent = 'Save Changes';
   301|    }
   302|  } catch(err) {
   303|    errors.style.display = 'block';
   304|    errors.textContent = 'Network error.';
   305|    btn.disabled = false; btn.textContent = 'Save Changes';
   306|  }
   307|  return false;
   308|}
   309|
   310|// ===== SOCIAL SHARING =====
   311|function renderShareButton(a) {
   312|  const sidebar = document.querySelector('.sidebar-footer');
   313|  if (!sidebar) return;
   314|  if (document.getElementById('shareBtn')) return;
   315|  const btn = document.createElement('button');
   316|  btn.id = 'shareBtn';
   317|  btn.textContent = '📤 Share My GripAge™';
   318|  btn.style.cssText = 'width:100%;padding:10px;margin-top:8px;background:transparent;border:1px solid var(--gray-700);border-radius:6px;color:var(--gray-500);font-size:0.85rem;cursor:pointer;transition:all 0.2s;';
   319|  btn.onmouseover = () => { btn.style.borderColor = 'var(--gold)'; btn.style.color = 'var(--gold)'; };
   320|  btn.onmouseout = () => { btn.style.borderColor = 'var(--gray-700)'; btn.style.color = 'var(--gray-500)'; };
   321|  btn.onclick = () => showShareModal(a);
   322|  sidebar.insertBefore(btn, sidebar.firstChild);
   323|}
   324|
   325|function showShareModal(a) {
   326|  const existing = document.getElementById('shareModal');
   327|  if (existing) existing.remove();
   328|  const shareText = a.yearsSaved > 0
   329|    ? `My GripAge™ is ${a.gripAge} — ${a.yearsSaved} years younger than my actual age. ${a.tier} Tier on @WorldDeadHangCh. Can you beat me? 💪🏆`
   330|    : `My GripAge™ is ${a.gripAge}. ${a.tier} Tier on @WorldDeadHangCh. Can you beat me? 💪🏆`;
   331|  const modal = document.createElement('div');
   332|  modal.id = 'shareModal';
   333|  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:1000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
   334|  modal.innerHTML = `
   335|    <div style="background:#111;border:1px solid var(--gray-800);border-radius:12px;padding:30px;max-width:450px;width:90%;position:relative;text-align:center;">
   336|      <button onclick="document.getElementById('shareModal').remove()" style="position:absolute;top:15px;right:15px;background:none;border:none;color:var(--gray-500);font-size:1.5rem;cursor:pointer;">&times;</button>
   337|      <h2 style="color:var(--gold);font-family:Oswald;margin:0 0 5px 0;">SHARE YOUR RESULT</h2>
   338|      <p style="color:var(--gray-500);font-size:0.85rem;margin:0 0 20px 0;">Show the world your GripAge™</p>
   339|      <div style="background:#000;border:2px solid ${a.tierColor || '#D4AF37'};border-radius:12px;padding:25px;margin-bottom:20px;">
   340|        <p style="color:var(--gray-500);font-size:0.75rem;text-transform:uppercase;margin:0 0 5px 0;">${a.displayName || 'Athlete'}</p>
   341|        <p style="color:var(--gold);font-size:2.5rem;font-weight:bold;margin:0;font-family:Oswald;">GripAge™: ${a.gripAge}</p>
   342|        <p style="color:#fff;font-size:1rem;margin:8px 0 0 0;">${a.tier} Tier · ${a.bestHangTime}</p>
   343|        ${a.yearsSaved > 0 ? `<p style="color:#4CAF50;font-size:0.9rem;margin:5px 0 0 0;">${a.yearsSaved} years younger 🎉</p>` : ''}
   344|        <p style="color:var(--gray-600);font-size:0.75rem;margin:10px 0 0 0;">worlddeadhang.com</p>
   345|      </div>
   346|      <textarea id="shareText" style="width:100%;padding:12px;background:#0a0a0a;border:1px solid var(--gray-700);border-radius:6px;color:#fff;font-size:0.9rem;resize:none;margin-bottom:15px;" rows="3">${shareText}</textarea>
   347|      <div style="display:flex;gap:10px;">
   348|        <button onclick="navigator.clipboard.writeText(document.getElementById('shareText').value);this.textContent='Copied!';setTimeout(()=>this.textContent='Copy Text',2000)" style="flex:1;padding:10px;background:var(--gray-800);color:#fff;border:none;border-radius:6px;font-weight:bold;cursor:pointer;">Copy Text</button>
   349|        <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}" target="_blank" style="flex:1;padding:10px;background:#1da1f2;color:#fff;border:none;border-radius:6px;font-weight:bold;text-decoration:none;text-align:center;">Tweet</a>
   350|      </div>
   351|    </div>`;
   352|  document.body.appendChild(modal);
   353|}
   354|