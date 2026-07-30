#!/usr/bin/env python3
import hashlib
import json
import re
import subprocess
from pathlib import Path

TASK = Path("research-ops/tasks/CBW-KZ-BINANCE-P0-D-DEEP-RESEARCH-001")
ORIGINAL = TASK / "20-research-output"
REVIEW_DIR = TASK / "50-source-truth-review"
CORRECTION_DIR = TASK / "60-correction"
CORRECTED = CORRECTION_DIR / "20-corrected-output"
VALIDATION_DIR = TASK / "70-validation"
SOURCE_HEAD = "b7e20065b5d1f6df8ac5d1ff5a9dfea1cc56f239"
VALIDATION_TASK = "CBW-KZ-BINANCE-P0-D-INDEPENDENT-VALIDATION-039"
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
EXPECTED_CORRECTIONS = [f"R037-C0{i}" for i in range(1, 9)]
checks = []


def add(name, ok, detail=""):
    checks.append({"name": name, "ok": bool(ok), "detail": str(detail)})
    return bool(ok)


def require(name, ok, detail=""):
    add(name, ok, detail)
    if not ok:
        raise RuntimeError(f"{name}: {detail}")


def load_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def write_json(path, obj):
    Path(path).write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8", newline="\n")


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def canonical_bytes(path):
    data = Path(path).read_bytes()
    require(f"canonical UTF-8/LF: {Path(path).name}", not data.startswith(b"\xef\xbb\xbf") and b"\r" not in data and all((b >= 0x20 or b in (0x09, 0x0A)) and b != 0x7F for b in data), f"bytes={len(data)}")
    data.decode("utf-8", errors="strict")
    return data


def all_false_authorizations(obj):
    bad = []
    def walk(value, prefix=""):
        if isinstance(value, dict):
            for key, child in value.items():
                path = f"{prefix}.{key}" if prefix else key
                if key.endswith("Authorized") and child is True:
                    bad.append(path)
                walk(child, path)
        elif isinstance(value, list):
            for i, child in enumerate(value):
                walk(child, f"{prefix}[{i}]")
    walk(obj)
    return bad


state = load_json(TASK / "TASK_STATE.json")
require("declared state is CORRECTED", state.get("state") == "CORRECTED", state.get("state"))
require("all task authorizations false", not any(state.get("authorizations", {}).values()), state.get("authorizations"))

# Independent immutability check against exact corrected source head before writing any validation output.
immutable_paths = [str(ORIGINAL), str(REVIEW_DIR), str(CORRECTION_DIR)]
diff = subprocess.run(["git", "diff", "--quiet", SOURCE_HEAD, "HEAD", "--", *immutable_paths])
require("original, review and correction stages unchanged from source head", diff.returncode == 0, f"git diff exit={diff.returncode}")

# Factory must already accept the exact CORRECTED evidence before the validator adds its own output.
pre = subprocess.run(
    ["node", "research-ops/factory-v1-1/bin/researchops.mjs", "validate", "--task-dir", str(TASK), "--require-package"],
    capture_output=True,
    text=True,
)
pre_tail = "\n".join((pre.stdout + pre.stderr).splitlines()[-5:])
require("Factory validates exact CORRECTED source head", pre.returncode == 0, pre_tail)

# Strict corrected inventory and canonical bytes.
actual = sorted(p.name for p in CORRECTED.iterdir() if p.is_file())
require("exactly eleven corrected files", actual == sorted(FILES), f"actual={actual}")
require("no nested entries in corrected package", all(p.is_file() for p in CORRECTED.iterdir()), "all entries must be regular files")
for name in FILES:
    canonical_bytes(CORRECTED / name)

# Parse all nine JSON outputs and check governed top-level structures.
json_names = [name for name in FILES if name.endswith(".json")]
parsed = {name: load_json(CORRECTED / name) for name in json_names}
require("9/9 corrected JSON files parse", len(parsed) == 9, f"count={len(parsed)}")
shape = {
    "research-run.json": ("overallFinding", dict),
    "source-verification.json": ("sources", list),
    "claim-verdicts.json": ("claims", list),
    "conflict-resolution.json": ("conflicts", list),
    "product-availability.json": ("products", list),
    "payment-rails.json": ("rails", list),
    "offer-eligibility-review.json": ("review", dict),
    "schema-normalization-notes.json": ("notes", list),
    "import-readiness.json": ("readiness", dict),
}
shape_bad = []
for name, (key, kind) in shape.items():
    if not isinstance(parsed[name], dict) or not isinstance(parsed[name].get(key), kind):
        shape_bad.append(f"{name}.{key}")
require("all governed corrected JSON shapes valid", not shape_bad, shape_bad)

# Corrected MANIFEST integrity.
manifest_lines = (CORRECTED / "MANIFEST.txt").read_text(encoding="utf-8").splitlines()
manifest = {}
manifest_bad = []
for line in manifest_lines:
    m = re.fullmatch(r"([0-9a-f]{64})  ([0-9]+)  (.+)", line)
    if not m:
        manifest_bad.append(line)
        continue
    manifest[m.group(3)] = (m.group(1), int(m.group(2)))
require("MANIFEST has canonical ten-file inventory", not manifest_bad and list(manifest.keys()) == HASHED, f"bad={manifest_bad}; keys={list(manifest.keys())}")
manifest_mismatch = []
for name in HASHED:
    data = (CORRECTED / name).read_bytes()
    expected_hash, expected_size = manifest[name]
    if sha256(data) != expected_hash or len(data) != expected_size:
        manifest_mismatch.append(name)
require("MANIFEST byte sizes and SHA-256 match", not manifest_mismatch, manifest_mismatch)

# ID uniqueness and cross-reference integrity.
sources = parsed["source-verification.json"]["sources"]
claims = parsed["claim-verdicts.json"]["claims"]
conflicts = parsed["conflict-resolution.json"]["conflicts"]
products = parsed["product-availability.json"]["products"]
rails = parsed["payment-rails.json"]["rails"]
collections = [
    ("source", sources, "sourceId"),
    ("claim", claims, "claimId"),
    ("conflict", conflicts, "conflictId"),
    ("product", products, "productId"),
    ("rail", rails, "railId"),
]
id_sets = {}
for label, items, key in collections:
    ids = [item.get(key) for item in items]
    valid = all(isinstance(x, str) and x for x in ids) and len(ids) == len(set(ids))
    require(f"unique {label} IDs", valid, f"count={len(ids)} unique={len(set(ids))}")
    id_sets[label] = set(ids)

xref_bad = []
for claim in claims:
    for key in ("supportedSourceIds", "contradictedSourceIds"):
        value = claim.get(key, [])
        if not isinstance(value, list) or len(value) != len(set(value)) or any(x not in id_sets["source"] for x in value):
            xref_bad.append(f"{claim.get('claimId')}.{key}")
for product in products:
    value = product.get("claimIds", [])
    if not isinstance(value, list) or len(value) != len(set(value)) or any(x not in id_sets["claim"] for x in value):
        xref_bad.append(f"{product.get('productId')}.claimIds")
for rail in rails:
    value = rail.get("sourceIds")
    if not isinstance(value, list) or len(value) != len(set(value)) or any(x not in id_sets["source"] for x in value):
        xref_bad.append(f"{rail.get('railId')}.sourceIds")
require("corrected cross-references resolve", not xref_bad, xref_bad)

# Strict correction marker bindings.
marker_path = CORRECTION_DIR / "CORRECTION_STATE.json"
marker_bytes = canonical_bytes(marker_path)
marker = json.loads(marker_bytes.decode("utf-8"))
review_bytes = (REVIEW_DIR / "SOURCE_TRUTH_REVIEW.json").read_bytes()
manifest_bytes = (CORRECTED / "MANIFEST.txt").read_bytes()
require("correction marker task identity", marker.get("taskId") == state.get("taskId"), marker.get("taskId"))
require("correction marker review outcome", marker.get("sourceReviewOutcome") == "ACCEPT_WITH_CORRECTIONS_REQUIRED", marker.get("sourceReviewOutcome"))
require("correction marker review SHA binding", marker.get("reviewSha256") == sha256(review_bytes), marker.get("reviewSha256"))
require("correction marker manifest SHA binding", marker.get("correctedManifestSha256") == sha256(manifest_bytes), marker.get("correctedManifestSha256"))
require("correction marker exact output inventory", marker.get("requiredOutputFiles") == FILES and marker.get("exactOutputFileCount") == 11, marker.get("requiredOutputFiles"))
require("exactly R037-C01 through R037-C08 applied", marker.get("appliedCorrectionIds") == EXPECTED_CORRECTIONS and marker.get("correctionsApplied") == 8, marker.get("appliedCorrectionIds"))

# Every correction ID must be traceable in the corrected records, not only in the marker.
serialized = "\n".join(json.dumps(parsed[name], ensure_ascii=False, sort_keys=True) for name in json_names)
missing_trace = [cid for cid in EXPECTED_CORRECTIONS if cid not in serialized]
require("all eight corrections traceable in corrected records", not missing_trace, missing_trace)

# Authorization floor across all governed objects.
auth_bad = []
for label, obj in [("task", state), ("correction", marker), *[(name, parsed[name]) for name in json_names]]:
    for path in all_false_authorizations(obj):
        auth_bad.append(f"{label}:{path}")
require("all authorization floors remain false", not auth_bad, auth_bad)

# No unsafe tracked task entries.
unsafe = subprocess.run(
    ["bash", "-lc", f"find '{TASK}' -type l -o -type f -perm /111"],
    capture_output=True,
    text=True,
)
require("no symlink or executable payload", unsafe.returncode == 0 and unsafe.stdout.strip() == "", unsafe.stdout.strip())

# Produce independent validation receipt only after all checks have passed.
VALIDATION_DIR.mkdir(parents=True, exist_ok=True)
auth = dict(state["authorizations"])
validation = {
    "schemaVersion": "1.0.0",
    "taskId": state["taskId"],
    "validationTaskId": VALIDATION_TASK,
    "governingIssue": 120,
    "evidencePullRequest": 69,
    "sourceCorrectedHeadSha": SOURCE_HEAD,
    "validatedAt": "2026-07-30",
    "validatorRole": "Independent deterministic validator",
    "method": "Independent byte, schema, manifest, identity, cross-reference, correction-trace, authorization, immutability and Factory validation. No new research, import or production action.",
    "checks": checks,
    "summary": {
        "total": len(checks),
        "passed": sum(1 for item in checks if item["ok"]),
        "failed": sum(1 for item in checks if not item["ok"]),
        "sourceIds": len(id_sets["source"]),
        "claimIds": len(id_sets["claim"]),
        "conflictIds": len(id_sets["conflict"]),
        "productIds": len(id_sets["product"]),
        "railIds": len(id_sets["rail"]),
    },
    "outcome": "VALIDATED_FOR_RESEARCH_RECORD_CLOSEOUT",
    "decision": "CBW_KZ_BINANCE_P0D_VALIDATION_039_VALIDATED_FOR_RESEARCH_RECORD_CLOSEOUT",
    "authorizations": auth,
}
write_json(VALIDATION_DIR / "CORRECTION_V2_VALIDATION.json", validation)

rows = [
    "# Binance × Kazakhstan — Independent Validation 039",
    "",
    f"- Source corrected head: `{SOURCE_HEAD}`",
    "- Outcome: `VALIDATED_FOR_RESEARCH_RECORD_CLOSEOUT`",
    "- Role: independent deterministic validator",
    "- All authorizations: false",
    "",
    "| Check | Result | Detail |",
    "|---|---|---|",
]
for item in checks:
    detail = item["detail"].replace("|", "\\|").replace("\n", " ")
    rows.append(f"| {item['name']} | {'PASS' if item['ok'] else 'FAIL'} | {detail} |")
rows += [
    "",
    "## Decision",
    "",
    "`CBW_KZ_BINANCE_P0D_VALIDATION_039_VALIDATED_FOR_RESEARCH_RECORD_CLOSEOUT`",
    "",
    "This validation authorizes only owner-closeout preparation. It does not authorize import, production, ranking, CTA, affiliate binding, publication, indexability, master change or deployment.",
]
(VALIDATION_DIR / "CORRECTION_V2_VALIDATION.md").write_text("\n".join(rows).rstrip("\n") + "\n", encoding="utf-8", newline="\n")

state["state"] = "VALIDATED"
state["stages"]["70-validation"] = "PRESENT"
if not any(item.get("state") == "VALIDATED" for item in state.get("history", [])):
    state["history"].append({"state": "VALIDATED", "at": "2026-07-30"})
write_json(TASK / "TASK_STATE.json", state)
print(f"VALIDATION_039_GENERATED: {len(checks)}/{len(checks)} checks PASS; state=VALIDATED")
