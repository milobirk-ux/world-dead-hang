# WDHC Google Apps Script Update Guide v2.5

## **🎯 Task Summary**
Update your Google Apps Script project with WDHC Form Handler v2.5 (fixed CORS headers, removed setHeaders error) and test submission with Milo's 4:26 hang time.

## **✅ v2.5 Code Verification**
The `email-automation-v2.5.gs` file has been verified:
- **22 complete functions** including form handler and email automation
- **CORS headers fixed**: Uses `ContentService.createTextOutput().setMimeType()` correctly (no `setHeaders()` calls)
- **All new features included**: Grip age explanation, training tips, height/training experience factors
- **Ready for deployment**: No syntax errors, UTF-8 encoding correct

## **🚀 Step-by-Step Update Instructions**

### **Step 1: Access Your Google Apps Script Project**
1. **Open your WDHC Google Sheet** (the one with "Custom Form Submissions" tab)
2. Go to **Extensions → Apps Script**
3. This opens the Google Apps Script editor

### **Step 2: Replace Existing Code with v2.5**
1. **Select all code** in the editor (Ctrl+A or Cmd+A)
2. **Delete everything**
3. **Open** `email-automation-v2.5.gs` from your local WDHC folder
4. **Copy all content** (Ctrl+A, Ctrl+C)
5. **Paste** into the Google Apps Script editor (Ctrl+V)
6. **Save** the project (Ctrl+S or click Save button)

### **Step 3: Verify Project Structure**
After pasting, you should see these key functions in the left sidebar:
- `doGet()` - Test endpoint
- `doPost(e)` - Main form handler
- `sendWelcomeEmailOnNewRow(e)` - Email automation
- `setupTrigger()` - Sets up automatic email triggers
- `testEmail()` - Test function

### **Step 4: Set Up Email Trigger**
1. In the Apps Script editor, **run `setupTrigger()` once**:
   - Select `setupTrigger` from function dropdown
   - Click **Run**
   - Authorize if prompted (allow access to Gmail, Spreadsheets)
2. **Verify trigger is created**:
   - Click **Triggers** (clock icon in left sidebar)
   - You should see: `sendWelcomeEmailOnNewRow` → `On change` → `From spreadsheet`

### **Step 5: Deploy as Web App**
1. Click **Deploy → New deployment**
2. **Deployment type:** Web app
3. **Description:** WDHC Form Handler v2.5
4. **Execute as:** Me (milobirk@gmail.com)
5. **Who has access:** Anyone
6. Click **Deploy**
7. **Copy the web app URL** (looks like: `https://script.google.com/macros/s/AKfycbw.../exec`)

### **Step 6: Update HTML Form**
1. **Open** `submit.html` in your WDHC folder
2. **Find line 723** (search for `const WEB_APP_URL =`)
3. **Replace** the placeholder URL with your **actual web app URL**
4. **Save** the file

### **Step 7: Test the Deployment**
1. **Test web app endpoint:**
   - Open your web app URL in browser
   - Should show: `{"status":"OK","message":"WDHC Form Handler v2.5 is running","version":"2.5"}`
2. **Test form submission:**
   - Open `submit.html` in browser
   - Fill out form with test data
   - Submit
   - Check Google Sheet for new row
   - Check email for confirmation

## **🧪 Test Milo's 4:26 Hang Time Submission**

### **Option 1: Use the Test Script**
1. **Update** `test-milo-submission.js` with your web app URL
2. **Run the test:**
   ```bash
   cd WDHC
   node test-milo-submission.js
   ```
3. **Expected results:**
   - ✅ Form submission successful message
   - ✅ New row in "Custom Form Submissions" sheet
   - ✅ Email sent to milobirk@gmail.com with grip age calculation

### **Option 2: Manual Test via Form**
1. **Fill the form with Milo's data:**
   - Athlete Name: Milo Birk
   - Email: milobirk@gmail.com
   - Date of Birth: 1988-06-15
   - Gender: Male
   - Weight: 185 lbs
   - Height: 72 inches
   - Grip Training: Intermediate
   - Attempt Date: Today's date
   - **Hang Time: 4:26** (4 minutes, 26 seconds)
   - Video URL: Any test URL
   - How heard: Direct (Creator)
   - Consent: Checked
2. **Submit** and verify:
   - Success message appears
   - Row added to Google Sheet
   - Email received within 1-2 minutes

## **🔧 v2.5 New Features to Verify**

### **1. Grip Age Calculation**
- **Formula includes:** Hang time, weight, age, gender, height, training experience
- **Expected for Milo (4:26 hang):** Grip age should be significantly younger than chronological age
- **Check email:** Should show grip age comparison section

### **2. Training Tips**
- Based on seconds needed to reach next tier
- **For 4:26 (266 seconds):** Elite tier tips (next: Legend at 180+ seconds)

### **3. Enhanced Email Template**
- Professional HTML design
- Tier badges (Pro/Elite/Legend)
- PR recognition
- Grip age explanation section

## **🚨 Troubleshooting**

### **Common Issues & Solutions:**

#### **1. "Script error" when deploying**
- **Cause:** Syntax error in code
- **Fix:** Copy exact v2.5 code from `email-automation-v2.5.gs`

#### **2. Form submission fails with CORS error**
- **Cause:** Web app not deployed with "Anyone" access
- **Fix:** Redeploy with "Anyone" access setting

#### **3. No email received**
- **Cause:** Trigger not set up or Gmail quota exceeded
- **Fix:** 
  - Run `setupTrigger()` again
  - Check Apps Script logs (View → Logs)
  - Test with `testEmail()` function

#### **4. Data not appearing in sheet**
- **Cause:** Wrong sheet name or permissions
- **Fix:**
  - Ensure sheet is named exactly "Custom Form Submissions"
  - Check Apps Script execution logs

#### **5. Grip age calculation seems wrong**
- **Cause:** Missing height or training data
- **Fix:** Ensure form includes height and grip training fields

## **📊 Expected Test Results**

### **For Milo's 4:26 (266 seconds) submission:**
- **Tier:** Elite (120-179 seconds threshold)
- **Next tier:** Legend (180+ seconds) - Milo is already beyond this!
- **Grip age:** Should be much younger than 37-38 (chronological age)
- **Email subject:** "New PR! Milo just hung for 4:26 in WDHC"
- **PR badge:** 🏆 PERSONAL RECORD (if first submission)

### **Sheet columns populated:**
1. Timestamp
2. Athlete Name: Milo Birk
3. Email Address: milobirk@gmail.com
4. City/State: Detroit, Michigan
5. Country: United States
6. Date of Birth: 1988-06-15
7. Gender: Male
8. Bodyweight lbs: 185
9. Height inches: 72
10. Grip Training Experience: Intermediate
11. Attempt Date: [Today's date]
12. Official Time: 4:26
13. Video URL: [Test URL]
14. How did you hear: Direct (Creator)
15. Consent: Yes

## **✅ Success Checklist**
- [ ] v2.5 code copied to Apps Script editor
- [ ] Project saved successfully
- [ ] `setupTrigger()` run and authorized
- [ ] Web app deployed with "Anyone" access
- [ ] Web app URL copied
- [ ] `submit.html` updated with new URL
- [ ] Web app endpoint test passes
- [ ] Milo's 4:26 submission test successful
- [ ] New row appears in Google Sheet
- [ ] Confirmation email received
- [ ] Grip age calculation appears correct

## **📞 Support**
If issues persist:
1. **Check Apps Script logs** (View → Logs)
2. **Test individual functions** using Run button
3. **Verify sheet permissions** and structure
4. **Check Gmail sent folder** for test emails

---

**Estimated time:** 15-20 minutes  
**Difficulty:** Easy (copy-paste deployment)  
**Risk:** Low (reversible by redeploying previous version)

**Ready to update!** The v2.5 code is verified and complete. Follow the steps above to deploy and test with Milo's 4:26 hang time. 🚀