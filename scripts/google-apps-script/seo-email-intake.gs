/**
 * SEO Email Intake — Google Apps Script
 * ========================================
 *
 * Reads unread emails labeled "SEO-Issues", classifies them by source
 * and issue type, then pushes structured JSON files to the GitHub
 * repository so Claude can process them via seo-issue-intake.mjs.
 *
 * Supported sources (auto-detected from sender):
 *   Google Search Console · Yandex Webmaster · Bing Webmaster
 *   Yandex Metrika · Google Analytics 4 · Microsoft Clarity
 *
 * Setup: see docs/seo-email-intake-setup.md
 *
 * SECURITY: All secrets live in PropertiesService — never hardcoded here.
 */

// ── Configuration ─────────────────────────────────────────────────────────────

/**
 * Load required config from Script Properties.
 * Throws if any required property is missing.
 */
function getConfig() {
  const props = PropertiesService.getScriptProperties();

  const required = ['GITHUB_TOKEN', 'GITHUB_OWNER', 'GITHUB_REPO'];
  for (const key of required) {
    if (!props.getProperty(key)) {
      throw new Error(
        `Missing Script Property: ${key}. ` +
        'Go to Project Settings → Script Properties and add it.'
      );
    }
  }

  return {
    githubToken:      props.getProperty('GITHUB_TOKEN'),
    githubOwner:      props.getProperty('GITHUB_OWNER'),
    githubRepo:       props.getProperty('GITHUB_REPO'),
    githubBranch:     props.getProperty('GITHUB_BRANCH') || 'main',
    inboxLabel:       'SEO-Issues',
    processedLabel:   'SEO-Issues/Processed',
    // Maximum emails to process per run (avoid GitHub API rate limits)
    maxPerRun:        parseInt(props.getProperty('MAX_PER_RUN') || '20'),
  };
}

// ── Source detection ──────────────────────────────────────────────────────────

/**
 * Known sender addresses/domains for each SEO tool.
 * Maps sender email → canonical source slug.
 */
var SENDER_MAP = [
  // Google Search Console
  { pattern: 'sc-noreply@google.com',             source: 'google-search-console' },
  { pattern: 'searchconsole-noreply@google.com',  source: 'google-search-console' },
  { pattern: 'webmaster-noreply@google.com',      source: 'google-search-console' },
  { pattern: 'google-search-console',             source: 'google-search-console' },
  // Yandex Webmaster
  { pattern: 'webmaster@yandex.ru',               source: 'yandex-webmaster' },
  { pattern: 'webmaster@yandex.com',              source: 'yandex-webmaster' },
  { pattern: 'noreply@webmaster.yandex.ru',       source: 'yandex-webmaster' },
  // Bing Webmaster
  { pattern: 'webmaster@bing.com',                source: 'bing-webmaster' },
  { pattern: 'msnbot@microsoft.com',              source: 'bing-webmaster' },
  { pattern: 'bingwebmaster',                     source: 'bing-webmaster' },
  // Yandex Metrika
  { pattern: 'metrika@yandex.ru',                 source: 'yandex-metrika' },
  { pattern: 'metrika@yandex.com',                source: 'yandex-metrika' },
  { pattern: 'noreply@metrika.yandex.ru',         source: 'yandex-metrika' },
  // GA4 / Google Analytics
  { pattern: 'analytics-noreply@google.com',      source: 'ga4' },
  { pattern: 'googleanalytics@google.com',        source: 'ga4' },
  // Microsoft Clarity
  { pattern: 'clarity@microsoft.com',             source: 'clarity' },
  { pattern: 'noreply@clarity.microsoft.com',     source: 'clarity' },
];

/**
 * Detect the SEO tool source from sender email.
 * Falls back to subject/body heuristics if sender unknown.
 */
function detectSource(sender, subject, body) {
  var senderLower = (sender || '').toLowerCase();
  var subjectLower = (subject || '').toLowerCase();

  // 1. Exact sender match
  for (var i = 0; i < SENDER_MAP.length; i++) {
    if (senderLower.indexOf(SENDER_MAP[i].pattern) !== -1) {
      return SENDER_MAP[i].source;
    }
  }

  // 2. Subject fallback
  if (subjectLower.indexOf('search console') !== -1)   return 'google-search-console';
  if (subjectLower.indexOf('yandex webmaster') !== -1) return 'yandex-webmaster';
  if (subjectLower.indexOf('bing webmaster') !== -1)   return 'bing-webmaster';
  if (subjectLower.indexOf('metrika') !== -1)          return 'yandex-metrika';
  if (subjectLower.indexOf('google analytics') !== -1) return 'ga4';
  if (subjectLower.indexOf('clarity') !== -1)          return 'clarity';

  return 'manual';
}

// ── Issue type detection ──────────────────────────────────────────────────────

/**
 * Classify issue type from subject + body text.
 * Returns a string matching data/seo-issues/_schema.ts IssueType.
 */
function detectIssueType(source, subject, body) {
  var text = ((subject || '') + ' ' + (body || '')).toLowerCase();

  // ── Google Search Console ─────────────────────────────────────────────────
  if (source === 'google-search-console') {
    // Structured data
    if (text.indexOf('pricecurrency') !== -1 ||
        (text.indexOf('iso 4217') !== -1))                  return 'schema:invalid-currency';
    if (text.indexOf('brand') !== -1 &&
        text.indexOf('invalid') !== -1)                     return 'schema:invalid-brand-type';
    if (text.indexOf('missing') !== -1 &&
        text.indexOf('required') !== -1)                    return 'schema:missing-required-field';
    if (text.indexOf('merchant listing') !== -1)            return 'schema:merchant-listing';
    if (text.indexOf('rich result') !== -1 &&
        text.indexOf('invalid') !== -1)                     return 'schema:invalid-field-value';
    if (text.indexOf('structured data') !== -1)             return 'schema:invalid-field-value';
    // Indexing
    if (text.indexOf('discovered') !== -1 &&
        text.indexOf('not indexed') !== -1)                 return 'indexing:discovered-not-indexed';
    if (text.indexOf('crawled') !== -1 &&
        text.indexOf('not indexed') !== -1)                 return 'indexing:crawled-not-indexed';
    if (text.indexOf('404') !== -1 ||
        text.indexOf('not found') !== -1)                   return 'indexing:404';
    if (text.indexOf('redirect') !== -1 &&
        text.indexOf('error') !== -1)                       return 'indexing:redirect-error';
    if (text.indexOf('canonical') !== -1)                   return 'indexing:canonical-mismatch';
    // Page experience
    if (text.indexOf('core web vital') !== -1 ||
        text.indexOf('lcp') !== -1)                         return 'core-web-vitals:lcp';
    if (text.indexOf('cls') !== -1 ||
        text.indexOf('layout shift') !== -1)                return 'core-web-vitals:cls';
    if (text.indexOf('mobile usability') !== -1)            return 'mobile-usability:viewport';
    if (text.indexOf('security issue') !== -1 ||
        text.indexOf('malware') !== -1)                     return 'indexing:blocked-robots';
  }

  // ── Yandex Webmaster ─────────────────────────────────────────────────────
  if (source === 'yandex-webmaster') {
    if (text.indexOf('sitemap') !== -1)                     return 'sitemap:error';
    if (text.indexOf('robots') !== -1)                      return 'robots:error';
    if (text.indexOf('duplicate') !== -1 &&
        text.indexOf('title') !== -1)                       return 'content:duplicate-title';
    if (text.indexOf('duplicate') !== -1 &&
        text.indexOf('description') !== -1)                 return 'content:duplicate-description';
    if (text.indexOf('excluded') !== -1 ||
        (text.indexOf('not') !== -1 &&
         text.indexOf('indexed') !== -1))                   return 'indexing:excluded';
    if (text.indexOf('quality') !== -1 ||
        text.indexOf('thin') !== -1)                        return 'page-quality:thin-content';
    if (text.indexOf('low') !== -1 &&
        text.indexOf('text') !== -1)                        return 'page-quality:low-text-ratio';
  }

  // ── Bing Webmaster ───────────────────────────────────────────────────────
  if (source === 'bing-webmaster') {
    if (text.indexOf('crawl error') !== -1)                 return 'crawl:error';
    if (text.indexOf('blocked') !== -1)                     return 'crawl:blocked';
    if (text.indexOf('sitemap') !== -1)                     return 'sitemap:error';
    if (text.indexOf('indexnow') !== -1)                    return 'indexnow:failure';
    if (text.indexOf('meta description') !== -1 ||
        text.indexOf('missing meta') !== -1)                return 'seo:missing-meta';
    if (text.indexOf('duplicate') !== -1 &&
        text.indexOf('title') !== -1)                       return 'seo:duplicate-title';
  }

  // ── Yandex Metrika ───────────────────────────────────────────────────────
  if (source === 'yandex-metrika') {
    if (text.indexOf('no data') !== -1 ||
        text.indexOf('not tracking') !== -1)                return 'tracking:no-data';
    if (text.indexOf('goal') !== -1 &&
        (text.indexOf('not firing') !== -1 ||
         text.indexOf('failed') !== -1))                    return 'tracking:goal-not-firing';
    if (text.indexOf('bounce') !== -1)                      return 'ux:high-bounce';
    if (text.indexOf('scroll') !== -1)                      return 'ux:low-scroll-depth';
    if (text.indexOf('affiliate') !== -1 ||
        text.indexOf('click track') !== -1)                 return 'conversion:broken-affiliate-click';
  }

  // ── GA4 ──────────────────────────────────────────────────────────────────
  if (source === 'ga4') {
    if (text.indexOf('tag not detected') !== -1 ||
        text.indexOf('no tag') !== -1 ||
        text.indexOf('tag not found') !== -1)               return 'tracking:tag-not-detected';
    if (text.indexOf('real-time') !== -1 ||
        text.indexOf('realtime') !== -1)                    return 'tracking:no-realtime-users';
    if (text.indexOf('event') !== -1 &&
        text.indexOf('mismatch') !== -1)                    return 'tracking:event-mismatch';
    if (text.indexOf('outbound') !== -1)                    return 'tracking:missing-outbound-events';
  }

  // ── Clarity ──────────────────────────────────────────────────────────────
  if (source === 'clarity') {
    if (text.indexOf('rage click') !== -1)                  return 'ux:rage-clicks';
    if (text.indexOf('dead click') !== -1)                  return 'ux:dead-clicks';
    if (text.indexOf('scroll drop') !== -1 ||
        text.indexOf('scroll depth') !== -1)                return 'ux:scroll-drop';
    if (text.indexOf('confusion') !== -1 ||
        text.indexOf('hesitation') !== -1)                  return 'ux:ui-confusion';
  }

  return 'unknown';
}

// ── Severity mapping ──────────────────────────────────────────────────────────

/**
 * Map issue type to severity.
 * critical > high > medium > low
 */
function detectSeverity(issueType, source, text) {
  var textLower = (text || '').toLowerCase();

  // Explicit urgency signals in email text
  if (textLower.indexOf('manual action') !== -1 ||
      textLower.indexOf('security') !== -1 ||
      textLower.indexOf('penalty') !== -1)                  return 'critical';

  var SEVERITY_MAP = {
    'schema:invalid-currency':            'high',
    'schema:invalid-brand-type':          'high',
    'schema:missing-required-field':      'high',
    'schema:merchant-listing':            'high',
    'schema:invalid-field-value':         'medium',
    'indexing:404':                       'critical',
    'indexing:redirect-error':            'high',
    'indexing:discovered-not-indexed':    'high',
    'indexing:crawled-not-indexed':       'medium',
    'indexing:canonical-mismatch':        'medium',
    'indexing:noindex-tag':               'high',
    'indexing:blocked-robots':            'critical',
    'indexing:excluded':                  'medium',
    'core-web-vitals:lcp':               'high',
    'core-web-vitals:cls':               'medium',
    'core-web-vitals:inp':               'medium',
    'mobile-usability:viewport':          'high',
    'mobile-usability:text-size':         'low',
    'mobile-usability:tap-targets':       'low',
    'sitemap:error':                      'high',
    'robots:error':                       'high',
    'crawl:error':                        'high',
    'crawl:blocked':                      'critical',
    'indexnow:failure':                   'medium',
    'content:duplicate-title':            'medium',
    'content:duplicate-description':      'low',
    'page-quality:thin-content':          'medium',
    'page-quality:low-text-ratio':        'low',
    'seo:missing-meta':                   'low',
    'seo:duplicate-title':                'medium',
    'tracking:no-data':                   'high',
    'tracking:goal-not-firing':           'high',
    'tracking:tag-not-detected':          'high',
    'tracking:event-mismatch':            'medium',
    'tracking:missing-outbound-events':   'medium',
    'conversion:broken-affiliate-click':  'critical',
    'ux:high-bounce':                     'medium',
    'ux:low-scroll-depth':                'medium',
    'ux:rage-clicks':                     'medium',
    'ux:dead-clicks':                     'medium',
    'ux:scroll-drop':                     'low',
    'ux:ui-confusion':                    'low',
  };

  return SEVERITY_MAP[issueType] || 'medium';
}

// ── Recommended fix templates ─────────────────────────────────────────────────

function getRecommendedFix(issueType) {
  var FIXES = {
    'schema:invalid-currency':           'Check priceCurrency fields in buildProductSchema() — map USDT/BTC/ETH to ISO 4217 "USD". Run: npm run seo:intake',
    'schema:invalid-brand-type':         'Change brand @type from "Organization" to "Brand" in buildProductSchema() in src/utils/seo.ts',
    'schema:missing-required-field':     'Identify missing field from GSC Rich Results report. Add to schema builder in src/utils/seo.ts',
    'schema:merchant-listing':           'Review MerchantListing schema requirements. Check Product schema in src/utils/seo.ts',
    'indexing:404':                      'Check if page was deleted or URL changed. Update sitemap.xml. Add redirect if needed.',
    'indexing:redirect-error':           'Check redirect chain in server config. Verify no redirect loops.',
    'indexing:discovered-not-indexed':   'Improve internal linking to affected pages. Check robots.txt allows crawl. Run IndexNow.',
    'indexing:crawled-not-indexed':      'Improve content quality and uniqueness. Check for thin content or duplicate issues.',
    'indexing:canonical-mismatch':       'Verify canonical tag in page head matches the page URL. Check src/layouts/Layout.astro',
    'indexing:blocked-robots':           'Check public/robots.txt — verify pages are not accidentally disallowed',
    'core-web-vitals:lcp':              'Optimise largest image on affected pages. Use WebP, add width/height, enable lazy loading',
    'core-web-vitals:cls':              'Add explicit width/height to all images and embeds. Avoid inserting content above fold',
    'mobile-usability:viewport':         'Ensure <meta name="viewport" content="width=device-width"> is in Layout.astro',
    'sitemap:error':                     'Regenerate sitemap: npm run build. Verify src/pages/sitemap.xml.ts',
    'crawl:error':                       'Check server logs for 5xx errors. Verify nginx/server config',
    'indexnow:failure':                  'Run: npm run indexnow:dry to test. Check INDEXNOW_KEY in scripts/indexnow.mjs',
    'tracking:no-data':                  'Verify counter ID in Analytics.astro. Check browser with disabled ad-blocker',
    'tracking:goal-not-firing':          'Open browser devtools, perform goal action, check network for goal hit',
    'conversion:broken-affiliate-click': 'Test affiliate link click in devtools. Verify exchange_click event fires',
    'ux:rage-clicks':                    'Check Clarity session recording. Identify unresponsive element. Fix or add feedback',
    'ux:dead-clicks':                    'Review Clarity heatmap. Remove visual cues that mislead users into clicking non-links',
  };
  return FIXES[issueType] || 'Review issue details and check related source files';
}

// ── Manual review flag ────────────────────────────────────────────────────────

/**
 * Returns true if this issue type must NEVER be auto-fixed.
 * Protects: fees, KYC, bonus values, affiliate URLs, legal text, geo restrictions.
 */
function requiresManualReview(issueType, rawText) {
  // These issue types always require human decision
  var ALWAYS_MANUAL = [
    'indexing:crawled-not-indexed',   // may require content rewrite
    'indexing:discovered-not-indexed',
    'page-quality:thin-content',
    'page-quality:low-text-ratio',
    'ux:rage-clicks',
    'ux:dead-clicks',
    'ux:ui-confusion',
    'unknown',
  ];

  if (ALWAYS_MANUAL.indexOf(issueType) !== -1) return true;

  // If the email body mentions exchange-specific data, flag for review
  var sensitive = [
    'bonus amount', 'fee', 'withdrawal limit', 'kyc', 'deposit minimum',
    'affiliate link', 'restricted', 'country', 'terms of service', 'disclaimer'
  ];
  var textLower = (rawText || '').toLowerCase();
  for (var i = 0; i < sensitive.length; i++) {
    if (textLower.indexOf(sensitive[i]) !== -1) return true;
  }

  return false;
}

// ── URL extraction ────────────────────────────────────────────────────────────

/**
 * Extract affected URLs from email body.
 * Looks for cryptobonusworld.com URLs and path patterns.
 */
function extractAffectedUrls(body) {
  var urls = [];
  if (!body) return urls;

  // Match full URLs
  var fullUrlRegex = /https?:\/\/(?:www\.)?cryptobonusworld\.com(\/[^\s"'<>]+)/gi;
  var match;
  while ((match = fullUrlRegex.exec(body)) !== null) {
    var path = match[1].replace(/[?#].*/, '').replace(/\/$/, '') + '/';
    if (urls.indexOf(path) === -1) urls.push(path);
  }

  // Match relative paths that look like our URL structure
  var pathRegex = /\/(exchanges|bonuses|bonus-codes|compare|guides|categories|countries|coins|use-cases)\/([a-z0-9-]+)\//gi;
  while ((match = pathRegex.exec(body)) !== null) {
    var path = match[0];
    if (urls.indexOf(path) === -1) urls.push(path);
  }

  return urls.slice(0, 50); // cap at 50
}

// ── GitHub API ────────────────────────────────────────────────────────────────

/**
 * Push a file to GitHub via the Contents API.
 * Creates the file if it doesn't exist, skips if it does (no overwrite).
 */
function pushToGitHub(config, filePath, content, commitMessage) {
  var apiUrl = 'https://api.github.com/repos/' +
    config.githubOwner + '/' + config.githubRepo +
    '/contents/' + filePath;

  var headers = {
    'Authorization': 'token ' + config.githubToken,
    'Content-Type':  'application/json',
    'Accept':        'application/vnd.github.v3+json',
    'User-Agent':    'CryptoBonusWorld-SEO-Intake/1.0',
  };

  // Check if file already exists (get SHA for update)
  var existingSha = null;
  try {
    var checkResponse = UrlFetchApp.fetch(apiUrl, {
      method: 'GET',
      headers: headers,
      muteHttpExceptions: true,
    });
    if (checkResponse.getResponseCode() === 200) {
      var existing = JSON.parse(checkResponse.getContentText());
      existingSha = existing.sha;
    }
  } catch (e) {
    // File doesn't exist — that's fine, we'll create it
  }

  // Skip if file already exists (idempotent — don't overwrite processed issues)
  if (existingSha) {
    Logger.log('File already exists, skipping: ' + filePath);
    return true;
  }

  // Create file
  var payload = {
    message: commitMessage || 'chore: intake SEO issue from email',
    content: Utilities.base64Encode(content, Utilities.Charset.UTF_8),
    branch:  config.githubBranch,
  };

  try {
    var response = UrlFetchApp.fetch(apiUrl, {
      method:             'PUT',
      headers:            headers,
      payload:            JSON.stringify(payload),
      muteHttpExceptions: true,
    });

    var code = response.getResponseCode();
    if (code === 201) {
      Logger.log('✅ Created: ' + filePath);
      return true;
    } else {
      Logger.log('❌ GitHub API error ' + code + ': ' + response.getContentText());
      return false;
    }
  } catch (e) {
    Logger.log('❌ GitHub push failed: ' + e.message);
    return false;
  }
}

// ── Email processing ──────────────────────────────────────────────────────────

/**
 * Process a single Gmail message into a structured issue JSON.
 */
function processMessage(message) {
  var sender    = message.getFrom();
  var subject   = message.getSubject();
  var body      = message.getPlainBody();
  var date      = message.getDate();
  var messageId = message.getId();

  // Truncate body to 4000 chars to stay within GitHub API limits
  var rawText   = body ? body.substring(0, 4000) : '';

  var source       = detectSource(sender, subject, rawText);
  var issueType    = detectIssueType(source, subject, rawText);
  var severity     = detectSeverity(issueType, source, rawText);
  var affectedUrls = extractAffectedUrls(rawText);
  var manualFlag   = requiresManualReview(issueType, rawText);

  return {
    id:                   'email:' + messageId,
    source:               source,
    issueType:            issueType,
    severity:             severity,
    subject:              subject,
    sender:               sender,
    receivedAt:           date.toISOString(),
    rawText:              rawText,
    affectedUrls:         affectedUrls,
    status:               'new',
    recommendedFix:       getRecommendedFix(issueType),
    manualReviewRequired: manualFlag,
    autoFixPolicy:        manualFlag ? 'manual-only' : 'requires-review',
    relatedFiles:         [],
    validationSteps:      [],
    notes:                'Auto-ingested from Gmail via Apps Script. Subject: ' + subject,
  };
}

// ── Gmail label helpers ───────────────────────────────────────────────────────

/**
 * Get or create a Gmail label by name.
 */
function getOrCreateLabel(name) {
  var label = GmailApp.getUserLabelByName(name);
  if (!label) {
    label = GmailApp.createLabel(name);
    Logger.log('Created label: ' + name);
  }
  return label;
}

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * Main function — run this on a time-trigger (every 30 minutes).
 * Reads unread emails in SEO-Issues label, processes them, pushes to GitHub.
 */
function processSeoEmails() {
  var config = getConfig();

  var inboxLabel     = getOrCreateLabel(config.inboxLabel);
  var processedLabel = getOrCreateLabel(config.processedLabel);

  // Search for unread threads in the SEO-Issues label
  var threads = GmailApp.search(
    'label:' + config.inboxLabel + ' is:unread',
    0,
    config.maxPerRun
  );

  if (threads.length === 0) {
    Logger.log('No unread SEO-Issues emails found.');
    return;
  }

  Logger.log('Processing ' + threads.length + ' thread(s)...');

  var processed = 0;
  var errors    = 0;

  for (var t = 0; t < threads.length; t++) {
    var thread   = threads[t];
    var messages = thread.getMessages();

    for (var m = 0; m < messages.length; m++) {
      var message = messages[m];
      if (!message.isUnread()) continue;

      try {
        var issue    = processMessage(message);
        var ts       = Utilities.formatDate(
          new Date(issue.receivedAt),
          'UTC',
          'yyyyMMdd-HHmmss'
        );
        var fileName = issue.source + '-' + ts + '-' + processed + '.json';
        var filePath = 'data/seo-issues/inbox/' + fileName;
        var json     = JSON.stringify(issue, null, 2);

        var success = pushToGitHub(
          config,
          filePath,
          json,
          'feat: intake SEO issue from ' + issue.source + ' [' + issue.issueType + ']'
        );

        if (success) {
          // Mark as read + add processed label
          message.markRead();
          thread.addLabel(processedLabel);
          thread.removeLabel(inboxLabel);
          processed++;
          Logger.log('✅ Processed: ' + issue.subject + ' → ' + filePath);
        } else {
          errors++;
          Logger.log('⚠ Failed to push: ' + issue.subject);
        }

      } catch (e) {
        errors++;
        Logger.log('❌ Error processing message: ' + e.message);
      }
    }
  }

  Logger.log('Done. Processed: ' + processed + ', Errors: ' + errors);
}

// ── Test function ─────────────────────────────────────────────────────────────

/**
 * Test function — run manually from Apps Script editor to verify setup.
 * Creates a synthetic test issue and pushes it to GitHub.
 * Delete the test file from the repo afterwards.
 */
function testIntake() {
  var config = getConfig();

  Logger.log('Testing GitHub connection...');
  Logger.log('Owner: ' + config.githubOwner);
  Logger.log('Repo:  ' + config.githubRepo);
  Logger.log('Branch: ' + config.githubBranch);

  var testIssue = {
    id:                   'test:' + new Date().getTime(),
    source:               'google-search-console',
    issueType:            'schema:invalid-currency',
    severity:             'high',
    subject:              '[TEST] Apps Script intake test',
    sender:               'sc-noreply@google.com',
    receivedAt:           new Date().toISOString(),
    rawText:              'TEST: Product — Invalid value in field priceCurrency. Value: USDT is not a valid ISO 4217 currency code.',
    affectedUrls:         ['/exchanges/bybit/', '/exchanges/binance/'],
    status:               'new',
    recommendedFix:       'TEST ISSUE — delete this file',
    manualReviewRequired: false,
    autoFixPolicy:        'safe',
    relatedFiles:         ['src/utils/seo.ts'],
    validationSteps:      ['Delete this test file'],
    notes:                'Created by testIntake() in Google Apps Script — delete me!',
  };

  var ts       = Utilities.formatDate(new Date(), 'UTC', 'yyyyMMdd-HHmmss');
  var filePath = 'data/seo-issues/inbox/TEST-intake-' + ts + '.json';
  var json     = JSON.stringify(testIssue, null, 2);

  var success = pushToGitHub(config, filePath, json, 'test: Apps Script intake test — delete this file');

  if (success) {
    Logger.log('✅ TEST PASSED — file created at: ' + filePath);
    Logger.log('   Delete it from the repo: git rm ' + filePath);
  } else {
    Logger.log('❌ TEST FAILED — check GitHub token and repo settings');
  }
}

/**
 * List all Gmail labels (helper for setup — run once to verify labels exist).
 */
function listLabels() {
  var labels = GmailApp.getUserLabels();
  Logger.log('Your Gmail labels:');
  for (var i = 0; i < labels.length; i++) {
    Logger.log('  - ' + labels[i].getName());
  }
}

/**
 * Create required Gmail labels (run once during setup).
 */
function createLabels() {
  var labels = ['SEO-Issues', 'SEO-Issues/Processed'];
  for (var i = 0; i < labels.length; i++) {
    var label = getOrCreateLabel(labels[i]);
    Logger.log('Label ready: ' + label.getName());
  }
}
