/*
 * WDHC Email Automation Script v2.7 - ENHANCED 
 * 
 * This script handles automated welcome emails for new WDHC submissions.
 * Targets the "custom form submissions" tab in the wdhc_database spreadsheet.
 * 
 * Features:
 * - Original email design with TIER BADGES
 * - Enhanced time parsing with detailed debugging
 * - Tracks emailed status in Column R
 * - Uses exact column names from "Custom Form Submissions" sheet
 * - Included grip age calculation based on training experience only
 * 
 * Last updated: 2026-03-27
 * Author: Otis (OpenClaw Assistant)
 * 
 * Version History:
 * v2.7 (2026-03-27): Enhanced grip age calculation included
 */

function sendWelcomeEmailOnNewRow(e) {
    if (e && e.changeType !== 'INSERT_ROW') return;

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName = "custom form submissions";
    const sheet = spreadsheet.getSheetByName(sheetName);

    if (!sheet) {
        console.error(`Sheet \