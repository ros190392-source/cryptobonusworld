# CBW Current Project State

- **State: RECONCILED_COMMITTED** — reconciled and committed after the production-credential security incident.
- Updated: 2026-07-23T13:08:44Z · by CLAUDE_CODE · trigger `CBW-SITE-PLATFORM-CURRENT-STATE-COMMIT-013-R2`
- **JSON source of truth: `owner-ops/status/CBW_CURRENT_PROJECT_STATE.json`** — this Markdown is generated from that JSON and must never be hand-drifted.

## 1. Current owner summary

The production-credential security incident is closed with no deployment. Source master is at
`0948fed` (security remediation merged, PR #1) and equals origin/master; production behavior is
unchanged from the 2026-07-18 rollback deployment. Architecture V3 is owner-approved and committed
on its feature branch but not merged into master; implementation and publication remain
unauthorized. The Exchange Review V2 prototype stays separate and uncommitted; production review
pages and their vertical hero cards remain frozen. Market-intelligence research files (172 untracked
paths) are preserved. This baseline is now reconciled and committed.

## 2. Production state

- Worktree `C:\projects\CryptoBonusWorld` · branch `master` · HEAD `0948fed6f29bb2d2ed7058fba4ed16fac636b3c8` = origin/master.
- Tracked tree clean. The security remediation merge was **not deployed**.
- Most recent production deployment remains the **2026-07-18 rollback** `183d5559af9e608f168636a7ff998b8fdf7f5a6b`,
  which restored the tracked behavior/tree of the `a4d89d4d1df420fc1922625cdde126f2064da4a2` release.
- Production exchange-review pages and their vertical hero cards remain frozen; no public GEO/market
  page was created or published; no architecture implementation was deployed.
- The 172 untracked entries belong to the market-intelligence stream, not production, and must not be
  cleaned or treated as architecture implementation.

## 3. Branch authority

- **`master`** = production/site authority and the PR base for code, design, architecture, content and data.
- **`main`** = workflows only (GitHub Actions); never merged with `master` in either direction.
- GitHub default-branch metadata (`main`) does not redefine production authority.

## 4. Active streams

| Stream | Worktree | Branch | HEAD | State | Last completed |
|---|---|---|---|---|---|
| production | `C:\projects\CryptoBonusWorld` | `master` | `0948fed` | IDLE | CBW-PRODUCTION-SECRETS-EMERGENCY-CLOSEOUT-017 |
| architecture | `C:\projects\CryptoBonusWorld-architecture-v3` | `feat/cbw-global-site-architecture-v3` | `1cb69ab` | AWAITING_OWNER | CBW-SITE-PLATFORM-CURRENT-STATE-COMMIT-013-R2 |
| design | `C:\projects\CryptoBonusWorld-design-v2` | `feat/cbw-exchange-review-v2` | `ee01f3c` | AWAITING_OWNER | CBW-EXCHANGE-REVIEW-V2-SELECTED-PROTOTYPE-001 |
| market-intelligence | `C:\projects\CryptoBonusWorld` | `master` | `0948fed` | AWAITING_OWNER | CBW-KZ-MEXC-P0-B-IMPORT-PREP-DESIGN-002 |
| locale | `C:\projects\CryptoBonusWorld-architecture-v3` | `feat/cbw-global-site-architecture-v3` | `1cb69ab` | IDLE | NOT_RECONCILED |
| security | `C:\projects\CryptoBonusWorld` | `master` | `0948fed` | IDLE | CBW-PRODUCTION-SECRETS-EMERGENCY-CLOSEOUT-017 |

- **Architecture** — owner-approved V3, current-state reconciliation now committed (this task), no
  implementation authorization; V3 not merged into master. The `1cb69ab` head is the baseline before
  this documentation commit, which advances the branch by one commit. Market-first URLs, locale rules,
  ten page-family definitions, RegionResolver, CountryVisualProfile system, RegionAvailabilityModule
  and the read-only Market Intelligence boundary are preserved unchanged.
- **Design** — design-v2 review prototype remains separate and uncommitted (THREE_ZONE_FIRST_SCREEN
  direction), awaiting `CBW-EXCHANGE-REVIEW-V2-OWNER-REVIEW-002`; production review heroes frozen;
  region-aware layout not committed; design-v1 worktree (`c8d004a`) non-active, no cleanup authorized.
- **Market Intelligence** — active source-master untracked research/evidence files preserved (172
  paths); next import task `CBW-KZ-MEXC-P0-B-STAGING-IMPORT-003` has not started; MI data is canonical
  only via read-only adapters and cannot bind directly to production pages.
- **Locale** — architecture only; no locale routes, no LIVE market-language pair; KZ/PL/DE pairs remain
  PLANNED; publication and data binding unauthorized.
- **Security** — incident closed; accepted backlog documented; no current P0 access exposure.

## 5. Architecture authority and commit chain

- Authority: **ARCHITECTURE_V3_OWNER_APPROVED_COMMITTED** across all 15 package files; not merged into master.
- Commit chain on `feat/cbw-global-site-architecture-v3`:
  1. `a3dea7e451d046d5f01515bf085962f6f92a9fa7` — initial architecture commit (task …COMMIT-004);
  2. `55aacac97554de11d7e8e42823857dcf56444b74` — lifecycle reconciliation (task …STATE-RECONCILE-006);
  3. `1cb69ab1cf79f9f42d1eb8a68678abad76fdc981` — LOCALE10 consistency fix (task …LOCALE10-CONSISTENCY-FIX-009; verified by …POST-LOCALE10-VERIFY-010);
  4. this current-state reconciliation commit (task …COMMIT-013-R2), one documentation commit above the `1cb69ab` baseline.
- Merge to master remains unauthorized (`MERGE_TO_MASTER_AUTHORIZED=false`).

## 6. Security incident

- **Status: RESOLVED_CURRENT_TREE / ACCESS_REVOKED / NO_DEPLOY.**
- Remediation: exposed production root password rotated and revoked out-of-band · SSH password
  authentication disabled · keyboard-interactive authentication disabled · root access restricted to
  public-key authentication · authorized root SSH key verified · current deployment code no longer
  contains hardcoded production credentials · remediation PR #1 merged into master (merge commit
  `0948fed6f29bb2d2ed7058fba4ed16fac636b3c8`) · Hetzner account 2FA enabled · no production deployment
  occurred during remediation · security worktree and security branch removed after merge.
- Accepted backlog: the revoked credential remains in historical Git objects (full Git-history rewrite
  is deferred and requires separate owner authorization); future migration from root deployment to a
  restricted non-root deploy user.
- No password, host, IP, username, key path or key fingerprint is recorded; the historical credential
  is described only as revoked/compromised.

## 7. Pending owner decisions

1. **OD-2026-07-23-ARCHITECTURE-PR** — proceed with `CBW-GLOBAL-SITE-ARCHITECTURE-V3-PR-REVIEW-014`
   then an owner-authorized merge of the architecture V3 branch into master?
2. **OD-2026-07-23-EXCHANGE-REVIEW-V2-DISPOSITION** — approve/revise/discard the uncommitted Exchange
   Review V2 prototype? (blocks `CBW-EXCHANGE-REVIEW-V2-OWNER-REVIEW-002`)
3. **OD-2026-07-23-MI-P0B-AND-UNTRACKED-DISPOSITION** — proceed with KZ MEXC P0-B staging import and
   disposition the 172 untracked entries?
4. **OD-2026-07-23-IMPLEMENTATION-WAVE-1** — authorize W1 (Exchange Review V2 rollout)?

## 8. Authorization

| Flag | Value |
|---|---|
| ARCHITECTURE_DESIGN_AUTHORIZED | **true** |
| COUNTRY_ART_GENERATION_AUTHORIZED | false |
| PAGE_IMPLEMENTATION_AUTHORIZED | false |
| PRODUCTION_ASSET_EXPORT_AUTHORIZED | false |
| PRODUCTION_DATA_BINDING_AUTHORIZED | false |
| AFFILIATE_ACTIVATION_AUTHORIZED | false |
| MERGE_TO_MASTER_AUTHORIZED | false |
| PUBLICATION_AUTHORIZED | false |
| DEPLOY_AUTHORIZED | false |

Security-remediation completion did **not** enable any production or implementation authorization.

## 9. Last authoritative deploy

**2026-07-18** — rollback commit `183d5559af9e608f168636a7ff998b8fdf7f5a6b`, restoring the tracked
behavior/tree of the `a4d89d4d1df420fc1922625cdde126f2064da4a2` release. This remains the most recent
production deployment; the security remediation merge (`0948fed`) and all architecture/design/MI work
are undeployed.

## 10. Explicitly not authorized

Country-art generation · page implementation · production asset export · production data binding ·
affiliate activation · merge to master (architecture V3) · publication of any country/market-language
pair · deployment · any `main`↔`master` merge · design-v1 worktree cleanup · untracked MI/QA scope
deletion.

## 11. Recommended next sequence

1. **`CBW-GLOBAL-SITE-ARCHITECTURE-V3-PR-REVIEW-014`** — independent review of the architecture V3 branch.
2. Owner-authorized merge of the architecture V3 branch into master (gated on `MERGE_TO_MASTER_AUTHORIZED`).
3. **`CBW-AI-OPS-FOUNDATION-V1-001`** — governance and automation infrastructure only (GitHub task
   contracts, issue forms, PR templates, branch authority, scope guards, CI gates, ChatGPT review flow,
   Claude Code execution contracts, controlled repair loop; no automatic production deployment).

Recommended next task: **`CBW-GLOBAL-SITE-ARCHITECTURE-V3-PR-REVIEW-014`**.
