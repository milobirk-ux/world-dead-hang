# World Dead Hang Championship: Leaderboard Operations SOP

## The Standard Workflow

1.  **Submission:** Athlete submits video via Tally.
2.  **Notification:** You receive an email from Tally.
3.  **Review:** You watch the video and verify the time.
4.  **Approval Command:** You tell me: **"approve [Athlete Name]"**.
5.  **Otis Execution:**
    *   I run `direct_leaderboard_sync.js`.
    *   The script authenticates with Google Sheets.
    *   It finds the athlete and updates Status to "Approved".
    *   It fetches ALL approved athletes.
    *   It generates the JSON data.
    *   It **overwrites** the `const athletes = [...]` section in `index.html` with the fresh data.
6.  **Verification:** I confirm "Leaderboard updated with [X] athletes."

## Reliability Assurance
- **No "AI Guesswork":** The update is done by a strict Node.js script. It's not me "thinking" about the HTML; it's code executing a precise find-and-replace operation.
- **Standardized:** The script looks for the exact `const athletes = [...]` pattern. As long as the HTML structure remains stable around that data block, it will work perfectly every time.

## Manual Override Protocol (If Otis is Down)

If I am offline, hit a rate limit, or am otherwise unavailable, you can update the leaderboard yourself in **less than 30 seconds** using the tools we built.

### Option A: The "Otis is Dead" Method (Command Line)
1.  **Open Terminal** (PowerShell or Command Prompt).
2.  **Navigate to Workspace:**
    `cd C:\Users\milob\.openclaw\workspace`
3.  **Run the Sync Script:**
    `node direct_leaderboard_sync.js`
    *(This assumes you have already marked them as "Approved" in the Google Sheet manually. If not, the script will just sync existing approved entries. To approve via command line is harder manually, so just update the sheet first).*

### Option B: The "Total Manual" Method (Google Sheet Only)
1.  **Open Google Sheet:** Go to "WDHC Database".
2.  **Update Status:** Change Column N to "Approved" for the athlete.
3.  **Run Script:** Run the command in Option A (`node direct_leaderboard_sync.js`).

### Option C: The "Code" Method (Editing HTML)
1.  Open `C:\Users\milob\.openclaw\workspace\WDHC\index.html` in a text editor (VS Code, Notepad).
2.  Scroll to the bottom `<script>` section.
3.  Manually add a new object to the `const athletes` array following the existing format.
4.  Save.

**Recommendation:** Use **Option B**. It keeps the Google Sheet as the source of truth and uses the script to do the heavy lifting of formatting the HTML.
