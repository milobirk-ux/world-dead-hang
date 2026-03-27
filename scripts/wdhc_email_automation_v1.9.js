/**
 * WDHC Email Automation Script v1.9 - ORIGINAL DESIGN
 * 
 * This script sends automated welcome emails for new WDHC submissions.
 * Targets the "custom form submissions" tab in the wdhc_database spreadsheet.
 * 
 * Features:
 * - ORIGINAL email design (not changed)
 * - Fixed time parsing bug (26 seconds vs 4:26)
 * - Tracks emailed status in Column R
 * - Uses EXACT column names from "Custom Form Submissions" sheet
 * 
 * Last updated: 2026-03-26
 * Author: Otis (OpenClaw Assistant)
 * 
 * Version History:
 * v1.9 (2026-03-26): Original email design + fixed time parsing
 * v1.8 (2026-03-26): Clean version without UTF-8 corruption
 * v1.7 (2026-03-26): Fixed exact column name matching
 */

function sendWelcomeEmailOnNewRow(e) {
    if (e && e.changeType !== 'INSERT_ROW') return;

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName = "custom form submissions";
    const sheet = spreadsheet.getSheetByName(sheetName);
    
    if (!sheet) {
        console.error(`Sheet \