/**
 * Framework Creative — contact form backend (Google Apps Script)
 * ---------------------------------------------------------------
 * What it does for every enquiry sent from the website:
 *   1. saves it as a new row in this Google Sheet ("Enquiries" tab)
 *   2. emails you the details (press Reply to answer the visitor directly)
 *   3. emails the visitor an automatic "thanks, I've got your message" reply
 *
 * Setup: see README → "Contact form (Google Sheet + Gmail)".
 * After changing this file: Deploy → Manage deployments → Edit → Version: New version → Deploy.
 */

// ---- Settings you can change ----
const OWNER_EMAIL = 'bharatmohanty06@gmail.com';   // where enquiries are sent
const STUDIO_NAME = 'Framework Creative';            // sender name shown in the emails
const OWNER_NAME  = 'Bharat';                        // used in the auto-reply sign-off
const WEBSITE_URL = 'https://bharat098.github.io/framework-creative/';
const SHEET_NAME  = 'Enquiries';

function doPost(e) {
  try {
    const p = (e && e.parameter) || {};
    if (p._gotcha) return json_({ ok: true });                   // hidden spam trap was filled → silently ignore

    const d = {
      name:    clean_(p.name, 100),
      email:   clean_(p.email, 200),
      company: clean_(p.company, 150),
      type:    clean_(p.type, 100) || 'Not specified',
      budget:  clean_(p.budget, 100) || 'Not specified',
      message: clean_(p.message, 5000),
      page:    clean_(p.page, 300)
    };
    if (!d.name || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email) || d.message.length < 20) {
      return json_({ ok: false, error: 'invalid' });
    }

    // Ignore an identical re-send from the same address within 2 minutes (double clicks, refreshes)
    const cache = CacheService.getScriptCache();
    const key = 'sent:' + Utilities.base64Encode(d.email.toLowerCase() + '|' + d.message.slice(0, 80));
    if (cache.get(key)) return json_({ ok: true, duplicate: true });

    // 1. Save to the sheet
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try { sheet_().appendRow([new Date(), d.name, d.email, d.company, d.type, d.budget, d.message, d.page]); }
    finally { lock.releaseLock(); }

    // 2. Email to you
    MailApp.sendEmail({
      to: OWNER_EMAIL,
      replyTo: d.email,
      name: STUDIO_NAME + ' website',
      subject: 'New enquiry: ' + d.type + ' — ' + d.name,
      body: plain_(d),
      htmlBody: ownerHtml_(d)
    });

    // 3. Automatic reply to the visitor
    const first = d.name.split(/\s+/)[0];
    MailApp.sendEmail({
      to: d.email,
      replyTo: OWNER_EMAIL,
      name: STUDIO_NAME,
      subject: 'Thanks, ' + first + ' — I\'ve got your message',
      body: 'Hi ' + first + ',\n\nThanks for getting in touch with ' + STUDIO_NAME + '. I\'ve received your enquiry and will reply to this email with questions, ideas and a quote.\n\nA copy of what you sent:\n\n' + plain_(d) + '\n\n' + OWNER_NAME + '\n' + STUDIO_NAME + '\n' + WEBSITE_URL,
      htmlBody: replyHtml_(d, first)
    });

    cache.put(key, '1', 120);
    return json_({ ok: true });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'server' });
  }
}

// Opening the web app address in a browser shows this (useful to check the deployment works)
function doGet() {
  return json_({ ok: true, service: STUDIO_NAME + ' contact form' });
}

// Run once from the editor (select "setup" → Run) to create the sheet and grant permissions
function setup() {
  sheet_();
  console.log('Ready. Remaining email quota today: ' + MailApp.getRemainingDailyQuota());
}

// ---------- helpers ----------
function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(['Received', 'Name', 'Email', 'Company', 'Project type', 'Budget', 'Message', 'Page']);
    sh.setFrozenRows(1);
    sh.getRange('A1:H1').setFontWeight('bold');
  }
  return sh;
}
function clean_(v, max) { return String(v == null ? '' : v).replace(/\s+$/g, '').trim().slice(0, max); }
function esc_(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function plain_(d) {
  return 'Name: ' + d.name + '\nEmail: ' + d.email + '\nCompany: ' + (d.company || '—') +
    '\nProject type: ' + d.type + '\nBudget: ' + d.budget + '\n\nMessage:\n' + d.message;
}
function rows_(d) {
  const r = [['Name', d.name], ['Email', d.email], ['Company', d.company || '—'], ['Project type', d.type], ['Budget', d.budget]];
  return r.map(x => '<tr><td style="padding:6px 14px 6px 0;color:#4b5b53;font-size:13px;white-space:nowrap;vertical-align:top">' + x[0] +
    '</td><td style="padding:6px 0;font-size:14px;font-weight:600;color:#10231a">' + esc_(x[1]) + '</td></tr>').join('');
}
function wrap_(inner) {
  return '<div style="background:#f4f8f5;padding:28px 12px;font-family:Arial,Helvetica,sans-serif">' +
    '<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #d9e4dd;border-radius:14px;overflow:hidden">' +
    '<div style="background:#10231a;color:#ffffff;padding:16px 24px;font-weight:700;font-size:15px;letter-spacing:.3px">' + STUDIO_NAME + '</div>' +
    '<div style="padding:24px">' + inner + '</div></div></div>';
}
function ownerHtml_(d) {
  return wrap_('<p style="margin:0 0 4px;color:#0e7a4e;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase">New enquiry</p>' +
    '<h1 style="margin:0 0 16px;font-size:20px;color:#10231a">' + esc_(d.name) + ' wants to work with you</h1>' +
    '<table style="border-collapse:collapse;margin-bottom:16px">' + rows_(d) + '</table>' +
    '<div style="background:#f4f8f5;border-radius:10px;padding:14px 16px;font-size:14px;line-height:1.6;color:#10231a;white-space:pre-wrap">' + esc_(d.message) + '</div>' +
    '<p style="margin:18px 0 0;font-size:13px;color:#4b5b53">Press <b>Reply</b> to answer ' + esc_(d.name) + ' directly. Saved in your “' + SHEET_NAME + '” sheet.</p>');
}
function replyHtml_(d, first) {
  return wrap_('<h1 style="margin:0 0 12px;font-size:20px;color:#10231a">Thanks, ' + esc_(first) + ' — I\'ve got your message</h1>' +
    '<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#10231a">Thanks for getting in touch with ' + STUDIO_NAME +
    '. I\'ve received your enquiry about <b>' + esc_(d.type) + '</b> and will reply to this email with questions, ideas and a quote.</p>' +
    '<p style="margin:0 0 8px;font-size:13px;color:#4b5b53">A copy of what you sent:</p>' +
    '<div style="background:#f4f8f5;border-radius:10px;padding:14px 16px;font-size:14px;line-height:1.6;color:#10231a;white-space:pre-wrap">' + esc_(d.message) + '</div>' +
    '<p style="margin:20px 0 0;font-size:15px;color:#10231a">' + OWNER_NAME + '<br><span style="color:#4b5b53;font-size:13px">' + STUDIO_NAME +
    ' · <a href="' + WEBSITE_URL + '" style="color:#0e7a4e">' + WEBSITE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '') + '</a></span></p>');
}
