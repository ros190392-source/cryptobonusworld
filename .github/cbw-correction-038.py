#!/usr/bin/env python3
import hashlib
import json
import re
import shutil
from pathlib import Path

TASK = Path("research-ops/tasks/CBW-KZ-BINANCE-P0-D-DEEP-RESEARCH-001")
SRC = TASK / "20-research-output"
DST = TASK / "60-correction" / "20-corrected-output"
REVIEW_PATH = TASK / "50-source-truth-review" / "SOURCE_TRUTH_REVIEW.json"
FILES = [
    "research-run.json",
    "source-verification.json",
    "claim-verdicts.json",
    "conflict-resolution.json",
    "product-availability.json",
    "payment-rails.json",
    "offer-eligibility-review.json",
    "schema-normalization-notes.json",
    "import-readiness.json",
    "source-truth-review-report.md",
    "MANIFEST.txt",
]
HASHED = [name for name in FILES if name != "MANIFEST.txt"]
CORRECTIONS = [f"R037-C0{i}" for i in range(1, 9)]


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, obj):
    path.write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8", newline="\n")


def record(items, key, value):
    for item in items:
        if item.get(key) == value:
            return item
    raise RuntimeError(f"required record missing: {key}={value}")


def tag(item, *ids):
    values = list(item.get("correctionIdsApplied", []))
    for cid in ids:
        if cid not in values:
            values.append(cid)
    item["correctionIdsApplied"] = values


def add_limitation(item, text):
    values = list(item.get("limitations", []))
    if text not in values:
        values.append(text)
    item["limitations"] = values


def add_note(item, text):
    old = str(item.get("notes") or "").strip()
    if text not in old:
        item["notes"] = f"{old} {text}".strip()


def set_claim(claims, cid, statement, verdict, confidence, verification_state, limitations, *correction_ids):
    item = record(claims, "claimId", cid)
    item["statement"] = statement
    item["verdict"] = verdict
    item["confidence"] = confidence
    item["verificationState"] = verification_state
    item["limitations"] = limitations
    tag(item, *correction_ids)
    return item


def patch_source(sources, sid, *, status=None, confidence=None, note=None, limitations=None, correction_ids=()):
    item = record(sources, "sourceId", sid)
    if status is not None:
        item["verificationStatus"] = status
    if confidence is not None:
        item["confidence"] = confidence
    if note:
        add_note(item, note)
    for text in limitations or []:
        add_limitation(item, text)
    tag(item, *correction_ids)
    return item


def patch_product(products, pid, status, notes, *correction_ids):
    item = record(products, "productId", pid)
    item["status"] = status
    item["notes"] = notes
    tag(item, *correction_ids)
    return item


def patch_rail(rails, rid, status, notes, directions=None, correction_ids=()):
    item = record(rails, "railId", rid)
    item["status"] = status
    item["notes"] = notes
    if directions is not None:
        item["directions"] = directions
    tag(item, *correction_ids)
    return item


def assert_all_false(obj, label):
    auth = obj.get("authorizations", obj.get("readiness", {}))
    bad = [k for k, v in auth.items() if k.endswith("Authorized") and v is True]
    if bad:
        raise RuntimeError(f"{label}: authorization floor violated: {bad}")


state = load_json(TASK / "TASK_STATE.json")
if state.get("state") != "CORRECTION_REQUIRED":
    raise RuntimeError(f"expected CORRECTION_REQUIRED, got {state.get('state')}")
review_bytes = REVIEW_PATH.read_bytes()
review = json.loads(review_bytes.decode("utf-8"))
if review.get("finalReviewOutcome") != "ACCEPT_WITH_CORRECTIONS_REQUIRED":
    raise RuntimeError("review outcome mismatch")
review_head = review.get("reviewedEvidenceHeadSha")
if not isinstance(review_head, str) or not re.fullmatch(r"[0-9a-f]{40}", review_head):
    raise RuntimeError("reviewed evidence head is missing or invalid")

if DST.exists():
    shutil.rmtree(DST)
DST.mkdir(parents=True)

# Start from byte-equivalent semantics: parse the immutable originals, then apply only R037-C01..C08.
run = load_json(SRC / "research-run.json")
sources_obj = load_json(SRC / "source-verification.json")
claims_obj = load_json(SRC / "claim-verdicts.json")
conflicts_obj = load_json(SRC / "conflict-resolution.json")
products_obj = load_json(SRC / "product-availability.json")
rails_obj = load_json(SRC / "payment-rails.json")
offer_obj = load_json(SRC / "offer-eligibility-review.json")
notes_obj = load_json(SRC / "schema-normalization-notes.json")
readiness_obj = load_json(SRC / "import-readiness.json")

sources = sources_obj["sources"]
claims = claims_obj["claims"]
conflicts = conflicts_obj["conflicts"]
products = products_obj["products"]
rails = rails_obj["rails"]

# R037-C01 — current AFSA licence explicitly lists Future and Option; residual caveat is account eligibility.
patch_source(
    sources,
    "SRC012",
    status="VERIFIED_DIRECT_OFFICIAL_PAGE_WITH_EXPLICIT_INVESTMENT_TYPES",
    confidence="high",
    note="Correction R037-C01: the current AFSA register explicitly states 'Permitted types of Investments: Future and Option'. Remaining uncertainty concerns account-level appropriateness, KYC/compliance and eligibility, not licence scope.",
    correction_ids=("R037-C01",),
)
set_claim(
    claims,
    "CLM012",
    "The current AFSA licence for BN KZ Technologies Limited lists the regulated activities and explicitly states permitted types of Investments: Future and Option.",
    "SUPPORTED",
    "high",
    "DIRECT_PUBLIC_REGULATOR_PAGE",
    ["Account-level appropriateness, KYC/compliance and product eligibility remain conditional."],
    "R037-C01",
)
set_claim(
    claims,
    "CLM029",
    "Kazakhstan-facing futures and options surfaces are public, and the current AFSA licence explicitly lists permitted investment types Future and Option; account-level access remains conditional on appropriateness, KYC/compliance and eligibility.",
    "SUPPORTED_WITH_ACCOUNT_ELIGIBILITY_LIMITATION",
    "high",
    "DIRECT_PUBLIC_REGULATOR_AND_EXCHANGE_SURFACES",
    ["No account-level product entitlement test was performed."],
    "R037-C01",
)

# R037-C02 — remove universal-eligibility wording from the dated expansion signal.
patch_source(
    sources,
    "SRC039",
    status="OFFICIAL_SEARCH_SNIPPET_DATED_EXPANSION_SIGNAL_ONLY",
    confidence="medium",
    note="Correction R037-C02: this is a dated 2025 expansion signal only and does not establish current universal eligibility; the phrase 'for all users' must not be used as current entitlement evidence.",
    limitations=["Does not prove current universal eligibility or account-level entitlement."],
    correction_ids=("R037-C02",),
)
set_claim(
    claims,
    "CLM030",
    "An official 2025 Kazakhstan expansion snippet indicates Futures Copy Trading and Options were announced for Kazakhstan-facing users. It does not establish current universal eligibility. The current AFSA licence lists Future and Option, while account-level appropriateness, KYC/compliance and eligibility remain conditional.",
    "SUPPORTED_AS_DATED_EXPANSION_SIGNAL_WITH_CURRENT_ELIGIBILITY_UNCONFIRMED",
    "medium",
    "OFFICIAL_SNIPPET_PLUS_DIRECT_REGULATOR_PAGE",
    ["Snippet evidence is dated and cannot prove current universal or account-level eligibility."],
    "R037-C01",
    "R037-C02",
)

# R037-C03 — guides remain official operational history; current rail availability is unconfirmed.
for sid in ("SRC027", "SRC028", "SRC029"):
    patch_source(
        sources,
        sid,
        status="VERIFIED_HISTORICAL_OPERATIONAL_GUIDE_CURRENT_STATUS_UNCONFIRMED",
        confidence="medium",
        note="Correction R037-C03: retain as official documented operational history; current live rail/provider availability was not independently confirmed.",
        limitations=["Current operational availability was not independently confirmed at review time."],
        correction_ids=("R037-C03",),
    )
set_claim(
    claims,
    "CLM022",
    "Official Binance guides document Freedom Bank KZT deposit/withdrawal and Kazakhstan-issued Mastercard cash-out processes as operational history; current live operational availability was not independently confirmed.",
    "SUPPORTED_HISTORICAL_DOCUMENTATION_CURRENT_STATUS_UNCONFIRMED",
    "medium",
    "DIRECT_OFFICIAL_GUIDES_CURRENT_RAIL_STATUS_UNCONFIRMED",
    ["No live provider surface or account-level rail test was performed."],
    "R037-C03",
)

# R037-C04 — method URLs are surface evidence only.
for sid in ("SRC031", "SRC032", "SRC033"):
    patch_source(
        sources,
        sid,
        status="VERIFIED_PAYMENT_METHOD_SURFACE_ONLY",
        confidence="medium",
        note="Correction R037-C04: the URL proves only a named payment-method surface. It does not prove active offers, both buy/sell directions or resident eligibility.",
        limitations=["Active offers, both directions and resident eligibility are not established by the method page alone."],
        correction_ids=("R037-C04",),
    )
set_claim(
    claims,
    "CLM024",
    "The KZT P2P marketplace and named local payment-method pages are publicly reachable. The method pages are surface evidence only and do not prove active offers, both buy/sell directions or resident eligibility.",
    "SUPPORTED_SURFACE_ONLY",
    "medium",
    "PUBLIC_MARKETPLACE_AND_METHOD_SURFACES_ONLY",
    ["No active order, direction or account-eligibility test was performed."],
    "R037-C04",
)

# R037-C05 — AIFC market-entry page is directly accessible.
src066 = patch_source(
    sources,
    "SRC066",
    status="VERIFIED_DIRECT_OFFICIAL_PAGE",
    confidence="high",
    note="Correction R037-C05: the AIFC market-entry article was directly accessible during Source Truth Review; the prior search-excerpt limitation is removed.",
    correction_ids=("R037-C05",),
)
src066["limitations"] = [x for x in src066.get("limitations", []) if not re.search(r"search|excerpt|snippet", str(x), re.I)]
set_claim(
    claims,
    "CLM008",
    "The AIFC market-entry article describing Binance's Kazakhstan/AIFC entry is directly accessible as an official page and supports the recorded market-entry history.",
    "SUPPORTED",
    "high",
    "DIRECT_PUBLIC_OFFICIAL_PAGE",
    [],
    "R037-C05",
)

# R037-C06 — Binance footer wording must not be conflated with the broader AFSA register.
for sid in ("SRC020", "SRC057"):
    patch_source(
        sources,
        sid,
        note="Correction R037-C06: Binance public footer wording commonly identifies Digital Asset Trading Platform and Custody; the broader activity list must be attributed separately to the AFSA register.",
        limitations=["This Binance page does not independently repeat every regulated activity shown in the AFSA register."],
        correction_ids=("R037-C06",),
    )
set_claim(
    claims,
    "CLM013",
    "Binance public footer wording commonly identifies Digital Asset Trading Platform and Custody authorization. The broader regulated-activity list is evidenced separately by the AFSA public register and must not be attributed to Binance pages unless a cited page states it.",
    "SUPPORTED_WITH_SOURCE_SEPARATION",
    "high",
    "DIRECT_EXCHANGE_PAGE_PLUS_SEPARATE_REGULATOR_REGISTER",
    ["Do not imply that every Binance page repeats all AFSA-registered activities."],
    "R037-C06",
)

# R037-C07 — snippet-only records are historical/monitoring leads, not strong current status proof.
for sid in ("SRC034", "SRC035", "SRC046", "SRC047", "SRC071"):
    patch_source(
        sources,
        sid,
        status="OFFICIAL_SNIPPET_ONLY_HISTORICAL_OR_MONITORING_LEAD",
        confidence="low",
        note="Correction R037-C07: retain as an official historical/monitoring lead only; it cannot establish strong current operational status or account eligibility.",
        limitations=["Direct current page evidence was not recovered; current operational/account eligibility remains under review."],
        correction_ids=("R037-C07",),
    )
set_claim(
    claims,
    "CLM027",
    "Official snippets support historical Binance Pay and QR-integration launch signals in Kazakhstan; current operational availability remains under review and is not established by snippet evidence alone.",
    "SUPPORTED_HISTORICAL_SNIPPET_ONLY_CURRENT_STATUS_UNCONFIRMED",
    "low",
    "OFFICIAL_SNIPPET_ONLY",
    ["No current direct page or account-level payment test was available."],
    "R037-C07",
)
set_claim(
    claims,
    "CLM035",
    "Launchpad exists as a global Binance product, while the Kazakhstan-specific official snippet is a historical monitoring lead and does not establish current resident eligibility.",
    "SUPPORTED_GLOBAL_PRODUCT_KZ_ELIGIBILITY_UNCONFIRMED",
    "medium",
    "DIRECT_GLOBAL_PAGE_PLUS_HISTORICAL_KZ_SNIPPET",
    ["Kazakhstan-specific current entitlement was not confirmed."],
    "R037-C07",
)
set_claim(
    claims,
    "CLM036",
    "An official snippet indicates the Binance Exchange NFT-service sunset, but the direct announcement page was not independently recovered; treat the record as a dated monitoring signal rather than strong current account evidence.",
    "SUPPORTED_SNIPPET_ONLY_WITH_DIRECT_PAGE_LIMITATION",
    "medium",
    "OFFICIAL_SNIPPET_ONLY",
    ["Direct announcement page was not independently recovered."],
    "R037-C07",
)
set_claim(
    claims,
    "CLM048",
    "An official Kazakhstan rollout snippet supports a historical Binance Wallet Web3-suite signal; current full-suite availability and account eligibility remain under review.",
    "SUPPORTED_HISTORICAL_SNIPPET_ONLY_CURRENT_STATUS_UNCONFIRMED",
    "low",
    "OFFICIAL_SNIPPET_ONLY",
    ["Current direct Kazakhstan product page and account entitlement were not confirmed."],
    "R037-C07",
)

# R037-C08 — dynamic terms/limits remain explicitly dated and cannot imply KZ/CBW eligibility.
for sid in ("SRC018", "SRC053", "SRC054", "SRC055"):
    item = patch_source(
        sources,
        sid,
        note="Correction R037-C08: numeric limits, referral maxima and conditions are dynamic, tied to the checked date, and require rechecking before publication.",
        limitations=["No Kazakhstan or CryptoBonusWorld campaign eligibility may be inferred without affirmative current evidence."],
        correction_ids=("R037-C08",),
    )
    item["dynamicAtCheckedDate"] = True
    item["recheckRequiredBeforePublication"] = True
set_claim(
    claims,
    "CLM026",
    "AFSA's FAQ supports the legal framework and the retail funding constraint recorded at the checked date. Numeric limits are dynamic and must be rechecked before publication.",
    "SUPPORTED_WITH_DATE_AND_DYNAMIC_LIMITATION",
    "high",
    "DIRECT_REGULATOR_PAGE_DYNAMIC_FACT",
    ["The numeric limit is date-bound and may change."],
    "R037-C08",
)
set_claim(
    claims,
    "CLM040",
    "A public Binance referral offer was visible at the checked date. Offer visibility does not prove Kazakhstan eligibility or CryptoBonusWorld campaign binding.",
    "SUPPORTED_DYNAMIC_PUBLIC_VISIBILITY_ONLY",
    "medium",
    "DIRECT_DYNAMIC_OFFER_PAGE",
    ["Terms and availability are dynamic; Kazakhstan eligibility is unconfirmed."],
    "R037-C08",
)
set_claim(
    claims,
    "CLM041",
    "The visible referral maxima and task conditions were recorded as dated, dynamic terms and require rechecking before publication.",
    "SUPPORTED_DYNAMIC_AT_CHECKED_DATE",
    "medium",
    "DIRECT_DYNAMIC_TERMS_PAGE",
    ["Amounts and conditions may change without notice."],
    "R037-C08",
)
set_claim(
    claims,
    "CLM042",
    "Public restriction notes provide general controls, but absence of a Kazakhstan exclusion is not affirmative Kazakhstan eligibility evidence and does not establish CryptoBonusWorld campaign eligibility.",
    "SUPPORTED_CONTROL_BOUNDARY",
    "high",
    "DIRECT_PUBLIC_RESTRICTION_TERMS",
    ["Affirmative current Kazakhstan and campaign-specific evidence is still required."],
    "R037-C08",
)

# Conflict correction.
cnf001 = record(conflicts, "conflictId", "CNF001")
cnf001["status"] = "RESOLVED_WITH_EXPLICIT_LICENCE_SCOPE_AND_ACCOUNT_ELIGIBILITY_CAVEAT"
cnf001["resolution"] = "The current AFSA licence explicitly lists permitted investment types Future and Option. Remaining uncertainty concerns account-level appropriateness, KYC/compliance and eligibility, not absence of licence scope."
cnf001["notes"] = "Correction R037-C01 replaces the former omission-based caveat while preserving account-level eligibility boundaries."
tag(cnf001, "R037-C01")

# Product corrections.
patch_product(products, "PRD003", "PUBLICLY_VISIBLE_AFSA_LICENCE_LISTS_FUTURE_ACCOUNT_ELIGIBILITY_CONDITIONAL", "AFSA explicitly lists Future; public surface exists. Account-level appropriateness, KYC/compliance and eligibility remain conditional.", "R037-C01", "R037-C02")
patch_product(products, "PRD004", "PUBLICLY_VISIBLE_AFSA_LICENCE_LISTS_OPTION_ACCOUNT_ELIGIBILITY_CONDITIONAL", "AFSA explicitly lists Option; the dated expansion snippet does not prove current universal eligibility.", "R037-C01", "R037-C02")
patch_product(products, "PRD012", "PUBLICLY_VISIBLE_ACCOUNT_ELIGIBILITY_CONDITIONAL", "Copy Trading is publicly documented; the dated expansion snippet does not establish current universal eligibility.", "R037-C02")
patch_product(products, "PRD007", "CURRENT_OPERATIONAL_AVAILABILITY_NOT_INDEPENDENTLY_CONFIRMED", "Official guides document Freedom Bank KZT operations historically; current live availability was not independently confirmed.", "R037-C03")
patch_product(products, "PRD008", "CURRENT_OPERATIONAL_AVAILABILITY_NOT_INDEPENDENTLY_CONFIRMED", "Official guide documents Kazakhstan-issued Mastercard cash-out historically; current live availability was not independently confirmed.", "R037-C03")
patch_product(products, "PRD009", "UNDER_REVIEW_HISTORICAL_SNIPPET_ONLY", "Historical Binance Pay/QR signals are snippet-only and cannot establish current operational availability.", "R037-C07")
patch_product(products, "PRD015", "OFFICIAL_SNIPPET_INDICATES_SERVICE_SUNSET_DIRECT_PAGE_UNRECOVERED", "The dated NFT-service sunset signal is official snippet evidence; direct current announcement evidence was not independently recovered.", "R037-C07")
patch_product(products, "PRD016", "UNDER_REVIEW_HISTORICAL_SNIPPET_ONLY", "Kazakhstan rollout evidence is snippet-only; current full-suite availability and account eligibility remain unconfirmed.", "R037-C07")

# Rail corrections.
patch_rail(rails, "RAIL003", "CURRENT_OPERATIONAL_AVAILABILITY_NOT_INDEPENDENTLY_CONFIRMED", "Official Freedom Bank guides remain documented operational history; current live deposit/withdrawal availability was not independently confirmed.", correction_ids=("R037-C03",))
patch_rail(rails, "RAIL004", "CURRENT_OPERATIONAL_AVAILABILITY_NOT_INDEPENDENTLY_CONFIRMED", "Official Mastercard cash-out guide remains documented operational history; current live availability was not independently confirmed.", correction_ids=("R037-C03",))
for rid in ("RAIL006", "RAIL007", "RAIL008"):
    patch_rail(rails, rid, "PAYMENT_METHOD_SURFACE_ONLY_ACTIVE_OFFERS_DIRECTIONS_ELIGIBILITY_UNCONFIRMED", "The named method page proves surface visibility only; active offers, buy/sell directions and resident eligibility were not established.", directions=[], correction_ids=("R037-C04",))
patch_rail(rails, "RAIL009", "UNDER_REVIEW_HISTORICAL_SNIPPET_ONLY", "The merchant QR/Binance Pay record is snippet-only and cannot establish current operational availability.", correction_ids=("R037-C07",))

# Offer boundary and dynamic terms.
review_offer = offer_obj["review"]
review_offer["checkedDate"] = "2026-07-29"
review_offer["offerStatus"] = "UNDER_REVIEW_DYNAMIC_TERMS_KZ_AND_CBW_ELIGIBILITY_UNCONFIRMED"
review_offer["verificationLevel"] = "L2_OFFER_VISIBLE_DYNAMIC_RECHECK_REQUIRED"
review_offer["reasoning"] = "A public Binance referral offer was visible at the checked date, but amounts and task conditions are dynamic. The reviewed evidence does not affirmatively establish Kazakhstan eligibility or bind an owner-approved CryptoBonusWorld campaign."
for text in (
    "Public offer amounts and conditions are dynamic and require rechecking before publication.",
    "Absence of Kazakhstan from a restriction list is not affirmative Kazakhstan eligibility evidence.",
):
    if text not in review_offer["limitations"]:
        review_offer["limitations"].append(text)
review_offer["correctionIdsApplied"] = ["R037-C08"]

# Research-run corrected synthesis while preserving the core recommendation/confidence.
run["correctionTrace"] = {
    "task": "CBW-KZ-BINANCE-P0-D-CORRECTION-038",
    "appliedCorrectionIds": CORRECTIONS,
    "correctedAt": "2026-07-30",
    "sourceReviewOutcome": "ACCEPT_WITH_CORRECTIONS_REQUIRED",
}
run["overallFinding"]["summary"] = "Binance has an active AFSA-registered Kazakhstan entity and licence. The current licence explicitly lists permitted investment types Future and Option. Public Kazakhstan-facing surfaces remain separated from account-level eligibility; documented KZT rails are historical/current-status-unconfirmed unless a live provider surface is separately verified; named P2P method pages are surface-only; snippet-only product signals remain under review; referral terms are dynamic and do not prove Kazakhstan or CBW campaign eligibility."
run["overallFinding"]["recommendation"] = "Treat Binance Kazakhstan as licensed and publicly reachable with claim-bound caveats. Do not publish current rail, universal product eligibility, named P2P method availability, snippet-only product status, or referral eligibility more strongly than the corrected evidence supports."
qa = {item.get("cluster"): item for item in run.get("quickAnswerCandidates", [])}
qa["KZT/payments"]["answer"] = "Official Binance guides document Freedom Bank KZT deposit/withdrawal and Kazakhstan-issued Mastercard cash-out processes, but current live operational availability was not independently confirmed."
qa["P2P"]["answer"] = "The KZT P2P marketplace and named payment-method pages are visible. Named method pages alone do not prove active offers, both directions or resident eligibility."
qa["products"]["answer"] = "The current AFSA licence explicitly lists Future and Option, and public product surfaces exist. Account-level appropriateness, KYC/compliance and eligibility remain conditional; snippet-only product signals remain under review."
qa["bonus/referral"]["answer"] = "A public referral offer was visible at the checked date, but amounts and terms are dynamic. Kazakhstan eligibility and any CryptoBonusWorld campaign binding remain unconfirmed."

# Schema notes and readiness remain research-only.
next_note = "NOTE008"
if not any(x.get("noteId") == next_note for x in notes_obj["notes"]):
    notes_obj["notes"].append({
        "noteId": next_note,
        "area": "correction-038",
        "note": "Applied exactly R037-C01 through R037-C08: explicit AFSA Future/Option scope; no universal eligibility wording; current rail status downgraded; P2P method surfaces limited; AIFC source upgraded to direct; Binance/AFSA disclosure separated; snippet-only statuses downgraded; dynamic terms dated and recheck-bound.",
    })
readiness_obj["correctionState"] = "CORRECTED_PENDING_INDEPENDENT_VALIDATION"
readiness_obj["appliedCorrectionIds"] = CORRECTIONS
for text in (
    "Current operational availability of the documented Freedom Bank and Mastercard KZT rails was not independently confirmed.",
    "Named P2P payment-method pages do not establish active offers, both directions or resident eligibility.",
    "Dynamic offer amounts and conditions require rechecking; Kazakhstan and CBW campaign eligibility remain unconfirmed.",
):
    if text not in readiness_obj["blockingLimitations"]:
        readiness_obj["blockingLimitations"].append(text)
readiness_obj["overallStatus"] = "CORRECTED_RESEARCH_RECORD_PENDING_INDEPENDENT_VALIDATION_NOT_FOR_PRODUCTION"

# Write corrected package in canonical UTF-8/LF.
write_json(DST / "research-run.json", run)
write_json(DST / "source-verification.json", sources_obj)
write_json(DST / "claim-verdicts.json", claims_obj)
write_json(DST / "conflict-resolution.json", conflicts_obj)
write_json(DST / "product-availability.json", products_obj)
write_json(DST / "payment-rails.json", rails_obj)
write_json(DST / "offer-eligibility-review.json", offer_obj)
write_json(DST / "schema-normalization-notes.json", notes_obj)
write_json(DST / "import-readiness.json", readiness_obj)

report = (SRC / "source-truth-review-report.md").read_text(encoding="utf-8")
addendum = """

## Correction 038 addendum — 2026-07-30

The corrected package applies exactly the eight Source Truth Review requirements:

- `R037-C01`: records the AFSA licence wording `Permitted types of Investments: Future and Option`; residual uncertainty is account-level eligibility.
- `R037-C02`: removes universal-eligibility wording from the dated 2025 expansion signal.
- `R037-C03`: retains Freedom Bank/Mastercard guides as operational history while marking current availability unconfirmed.
- `R037-C04`: limits named P2P method URLs to surface evidence only.
- `R037-C05`: records the AIFC market-entry article as directly accessible.
- `R037-C06`: separates Binance footer disclosure from the broader AFSA-register activity list.
- `R037-C07`: downgrades snippet-only records to historical/monitoring leads.
- `R037-C08`: keeps limits, offer maxima and conditions explicitly dated/dynamic and does not infer Kazakhstan or CBW eligibility.

The core research recommendation and all-false authorization boundary are preserved. This corrected record is not approved for import, production, ranking, CTA, affiliate binding, publication, indexability or deployment.
"""
(DST / "source-truth-review-report.md").write_text(report.rstrip("\n") + addendum + "\n", encoding="utf-8", newline="\n")

manifest_lines = []
for name in HASHED:
    data = (DST / name).read_bytes()
    manifest_lines.append(f"{hashlib.sha256(data).hexdigest()}  {len(data)}  {name}")
(DST / "MANIFEST.txt").write_text("\n".join(manifest_lines) + "\n", encoding="utf-8", newline="\n")

# Strict Correction 038A marker.
auth = dict(state["authorizations"])
if any(auth.values()):
    raise RuntimeError("task authorizations are not all false")
marker = {
    "schemaVersion": "1.0.0",
    "taskId": state["taskId"],
    "correctionTaskId": "CBW-KZ-BINANCE-P0-D-CORRECTION-038",
    "outcome": "CORRECTED_READY_FOR_INDEPENDENT_VALIDATION",
    "outputDirectory": "60-correction/20-corrected-output",
    "requiredOutputFiles": FILES,
    "exactOutputFileCount": 11,
    "sourceReviewHeadSha": review_head,
    "sourceReviewOutcome": "ACCEPT_WITH_CORRECTIONS_REQUIRED",
    "reviewSha256": hashlib.sha256(review_bytes).hexdigest(),
    "correctedManifestSha256": hashlib.sha256((DST / "MANIFEST.txt").read_bytes()).hexdigest(),
    "appliedCorrectionIds": CORRECTIONS,
    "correctionsApplied": len(CORRECTIONS),
    "correctedAt": "2026-07-30",
    "immutableOriginalPackagePreserved": True,
    "immutableSourceTruthReviewPreserved": True,
    "authorizations": auth,
}
write_json(TASK / "60-correction" / "CORRECTION_STATE.json", marker)

# State transition only CORRECTION_REQUIRED -> CORRECTED.
state["state"] = "CORRECTED"
state["stages"]["60-correction"] = "PRESENT"
if not any(x.get("state") == "CORRECTED" for x in state.get("history", [])):
    state["history"].append({"state": "CORRECTED", "at": "2026-07-30"})
write_json(TASK / "TASK_STATE.json", state)

# Local deterministic assertions before Factory validation.
actual = sorted(p.name for p in DST.iterdir())
if sorted(FILES) != actual:
    raise RuntimeError(f"corrected inventory mismatch: {actual}")
for name in FILES:
    data = (DST / name).read_bytes()
    if b"\r" in data or data.startswith(b"\xef\xbb\xbf"):
        raise RuntimeError(f"non-canonical bytes: {name}")
for name in [x for x in FILES if x.endswith(".json")]:
    json.loads((DST / name).read_text(encoding="utf-8"))
assert_all_false(state, "TASK_STATE")
assert_all_false(marker, "CORRECTION_STATE")
assert_all_false(readiness_obj, "import-readiness")
print("CORRECTION_038_GENERATED: 8/8 corrections, 11 files, all authorizations false")
