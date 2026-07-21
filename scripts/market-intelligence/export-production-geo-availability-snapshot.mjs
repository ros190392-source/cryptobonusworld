#!/usr/bin/env node
/**
 * CBW MIGRATION_3A — Production GEO availability snapshot exporter (SAFE, static AST).
 *
 * Produces a deterministic, machine-readable snapshot of the CURRENT production
 * Kazakhstan availability overrides declared in src/data/geoRankings.ts
 * (object path MANUAL_OVERRIDES.kazakhstan), so the MIGRATION_3 discrepancy
 * comparison can treat the production-ranking dimension as comparable instead of
 * INCOMPARABLE.
 *
 * This snapshot is a READ-ONLY projection. It is NOT a new source of truth.
 * Production behaviour stays owned by src/data/geoRankings.ts and is never modified.
 *
 * SAFE EXTRACTION:
 *  - uses the TypeScript Compiler API (direct committed devDependency `typescript`)
 *    to STATICALLY parse geoRankings.ts into an AST — no runtime evaluation of the
 *    module, no import of the module, no regex, no string slicing, no hand-copied
 *    values, no child process, no network;
 *  - reads only src/data/geoRankings.ts (+ config/geo via the shared adapter core
 *    for country resolution);
 *  - rejects spreads, computed properties, shorthand, methods/accessors, function
 *    calls, imported/identifier values, template/dynamic expressions, duplicate
 *    exchange ids, and any availability value outside {available, restricted, unknown};
 *  - never infers availability from UI presence, affiliate, bonus, CTA or MI state.
 *
 * WRITE SAFETY:
 *  - the only path this script may ever write is
 *    owner-ops/market-intelligence/snapshots/production-geo-availability-<code>.json
 *    and only during an explicit --write (currently only --country KZ is approved);
 *  - --write refuses to overwrite a DIFFERING tracked snapshot unless --force.
 *
 * Usage:
 *   node scripts/market-intelligence/export-production-geo-availability-snapshot.mjs --country KZ --dry-run
 *   node scripts/market-intelligence/export-production-geo-availability-snapshot.mjs --country KZ --check
 *   node scripts/market-intelligence/export-production-geo-availability-snapshot.mjs --country KZ --write [--force]
 *   node scripts/market-intelligence/export-production-geo-availability-snapshot.mjs --help
 *
 * Exit codes: 0 success · 1 validation/input/source error · 2 unsafe mode or overwrite refusal
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { err, resolveCountryConfig, REPO_ROOT } from './lib/geo-mi-adapter-core.mjs';

const SNAPSHOT_VERSION = 'MIGRATION_3A';
const SOURCE_REL = 'src/data/geoRankings.ts';
const SOURCE_ABS = join(REPO_ROOT, 'src', 'data', 'geoRankings.ts');
const SNAP_DIR_ABS = join(REPO_ROOT, 'owner-ops', 'market-intelligence', 'snapshots');
const OVERRIDES_IDENT = 'MANUAL_OVERRIDES';
const ALLOWED_AVAILABILITY = ['available', 'restricted', 'unknown'];
// Only these country codes have an approved snapshot output path in MIGRATION_3A.
const WRITABLE_CODES = ['KZ'];

function refuse(msg) { console.error(`REFUSED: ${msg}`); process.exit(2); }

function help(code = 0) {
  console.log(`CBW MIGRATION_3A — production GEO availability snapshot exporter (safe, static AST)

  --country <ISO-2>   required (e.g. KZ)
  --dry-run           print generated snapshot JSON to stdout; write nothing
  --check             compare generated snapshot to the tracked file (drift check)
  --write             write the approved snapshot path (KZ only)
  --force             with --write, allow overwriting a DIFFERING tracked snapshot
  --help              this help

Exactly one of --dry-run | --check | --write is required.
Reads src/data/geoRankings.ts via the TypeScript compiler AST (no eval, no regex).
Writes only owner-ops/market-intelligence/snapshots/production-geo-availability-<code>.json.
Exit: 0 success · 1 validation/input/source error · 2 unsafe mode or overwrite refusal.`);
  process.exit(code);
}

function parseArgs(argv) {
  const a = { country: null, dryRun: false, check: false, write: false, force: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === '--help' || t === '-h') a.help = true;
    else if (t === '--dry-run') a.dryRun = true;
    else if (t === '--check') a.check = true;
    else if (t === '--write') a.write = true;
    else if (t === '--force') a.force = true;
    else if (t === '--country') a.country = argv[++i];
    else if (t.startsWith('--country=')) a.country = t.slice(10);
    else err(`unknown argument: ${t} (use --help)`);
  }
  return a;
}

/* ---------------- safe static AST extraction (no runtime evaluation) ---------------- */

// Collect direct property assignments of an object literal, rejecting every unsafe member kind.
function literalProps(objLit, label) {
  const map = new Map(); // preserves source declaration order
  for (const m of objLit.properties) {
    if (ts.isSpreadAssignment(m)) err(`${label}: spread element not allowed (rejected)`);
    if (ts.isShorthandPropertyAssignment(m)) err(`${label}: shorthand property not allowed (rejected)`);
    if (ts.isMethodDeclaration(m) || ts.isGetAccessorDeclaration(m) || ts.isSetAccessorDeclaration(m)) {
      err(`${label}: method/accessor member not allowed (rejected)`);
    }
    if (!ts.isPropertyAssignment(m)) err(`${label}: unsupported member kind ${ts.SyntaxKind[m.kind]} (rejected)`);
    const nameNode = m.name;
    if (ts.isComputedPropertyName(nameNode)) err(`${label}: computed property name not allowed (rejected)`);
    let key;
    if (ts.isIdentifier(nameNode)) key = nameNode.text;
    else if (ts.isStringLiteral(nameNode)) key = nameNode.text;
    else err(`${label}: unsupported property-name kind ${ts.SyntaxKind[nameNode.kind]} (rejected)`);
    if (map.has(key)) err(`${label}: duplicate key "${key}" (rejected)`);
    map.set(key, m.initializer);
  }
  return map;
}

function requireObjectLiteral(node, label) {
  if (!node || !ts.isObjectLiteralExpression(node)) {
    err(`${label} is not a plain object literal (got ${node ? ts.SyntaxKind[node.kind] : 'nothing'}) — dynamic expression rejected`);
  }
  return node;
}

// Read a plain string-literal initializer; reject identifiers/calls/templates/any dynamic node.
function stringLiteralValue(node, label) {
  if (node && ts.isStringLiteral(node)) return node.text;
  err(`${label} is not a plain string literal (got ${node ? ts.SyntaxKind[node.kind] : 'nothing'}) — imported/computed/call/template/dynamic value rejected`);
}

function extractCountryAvailability(sourceText, slug, universe) {
  const sf = ts.createSourceFile(SOURCE_REL, sourceText, ts.ScriptTarget.Latest, /* setParentNodes */ true, ts.ScriptKind.TS);

  // Locate the MANUAL_OVERRIDES variable declaration (there must be exactly one).
  const initializers = [];
  (function walk(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === OVERRIDES_IDENT) {
      initializers.push(node.initializer);
    }
    ts.forEachChild(node, walk);
  })(sf);
  if (initializers.length === 0) err(`${OVERRIDES_IDENT} declaration not found in ${SOURCE_REL}`);
  if (initializers.length > 1) err(`${OVERRIDES_IDENT} declared more than once (${initializers.length}) — ambiguous, rejected`);

  const overrides = requireObjectLiteral(initializers[0], OVERRIDES_IDENT);
  const topProps = literalProps(overrides, OVERRIDES_IDENT);
  const countryInit = topProps.get(slug);
  if (!countryInit) err(`${OVERRIDES_IDENT} has no "${slug}" entry (present: ${[...topProps.keys()].join(', ') || 'none'})`);

  const countryObj = requireObjectLiteral(countryInit, `${OVERRIDES_IDENT}.${slug}`);
  const exProps = literalProps(countryObj, `${OVERRIDES_IDENT}.${slug}`);
  if (exProps.size === 0) err(`${OVERRIDES_IDENT}.${slug} declares no exchanges`);

  const exchanges = [];
  let position = 0; // 1-based productionPosition, derived from AST declaration order — never hardcoded
  for (const [exId, exInit] of exProps) { // Map iteration = source declaration order
    position += 1;
    const label = `${OVERRIDES_IDENT}.${slug}.${exId}`;
    if (!universe.includes(exId)) err(`${label}: "${exId}" is not in the ${slug} exchange universe [${universe.join(', ')}] (rejected)`);
    const rowObj = requireObjectLiteral(exInit, label);
    const rowProps = literalProps(rowObj, label);
    const availInit = rowProps.get('availability');
    if (!availInit) err(`${label}: no explicit "availability" property (rejected — never inferred)`);
    const availability = stringLiteralValue(availInit, `${label}.availability`);
    if (!ALLOWED_AVAILABILITY.includes(availability)) {
      err(`${label}.availability = "${availability}" is not one of {${ALLOWED_AVAILABILITY.join(', ')}} (rejected)`);
    }
    exchanges.push({ exchangeId: exId, productionAvailability: availability, productionPosition: position });
  }
  return exchanges;
}

/* ---------------- snapshot assembly (deterministic; no timestamp/git/wall-clock) ---------------- */

function buildSnapshot(code, slug, sourceText, exchanges) {
  const sourceSha256 = createHash('sha256').update(sourceText, 'utf8').digest('hex');
  return {
    snapshotVersion: SNAPSHOT_VERSION,
    snapshotKind: 'PRODUCTION_GEO_AVAILABILITY',
    countryCode: code,
    countrySlug: slug,
    sourcePath: SOURCE_REL,
    sourceObjectPath: `${OVERRIDES_IDENT}.${slug}`,
    sourceSha256,
    productionRemainsAuthoritative: true,
    generatedSnapshotIsReadOnly: true,
    exchanges,
  };
}

function serialize(snapshot) {
  return JSON.stringify(snapshot, null, 2) + '\n';
}

function snapshotPath(code) {
  return join(SNAP_DIR_ABS, `production-geo-availability-${code.toLowerCase()}.json`);
}
function snapshotRel(code) {
  return `owner-ops/market-intelligence/snapshots/production-geo-availability-${code.toLowerCase()}.json`;
}

/* ---------------- main ---------------- */

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) help(0);
  if (!args.country) err('--country is required (use --help)');

  const modes = [args.dryRun && 'dry-run', args.check && 'check', args.write && 'write'].filter(Boolean);
  if (modes.length === 0) refuse('a mode is required: --dry-run | --check | --write (no default write mode)');
  if (modes.length > 1) err(`choose exactly one mode (got: ${modes.join(', ')})`);
  if (args.force && !args.write) err('--force is only valid with --write');

  // Resolve country → slug + exchange universe via the shared adapter core (read-only, deterministic).
  const { cfg } = resolveCountryConfig(args.country);
  const code = String(cfg.country).toUpperCase();
  const slug = cfg.country_slug;
  const universe = Array.isArray(cfg.exchanges) ? cfg.exchanges.slice() : [];
  if (universe.length === 0) err(`config for ${code} defines no exchanges`);

  if (!existsSync(SOURCE_ABS)) err(`production source not found: ${SOURCE_REL}`);
  const sourceText = readFileSync(SOURCE_ABS, 'utf8');

  const exchanges = extractCountryAvailability(sourceText, slug, universe);
  const snapshot = buildSnapshot(code, slug, sourceText, exchanges);
  const generated = serialize(snapshot);

  if (args.dryRun) {
    process.stdout.write(generated);
    process.exit(0);
  }

  const outPath = snapshotPath(code);
  const outRel = snapshotRel(code);

  if (args.check) {
    if (!existsSync(outPath)) err(`no tracked snapshot at ${outRel} (run --write first)`);
    const tracked = readFileSync(outPath, 'utf8');
    if (tracked === generated) {
      console.log(`CHECK OK — ${outRel} matches current production (${SOURCE_REL}).`);
      process.exit(0);
    }
    console.error(`CHECK FAILED — ${outRel} differs from current production extraction.`);
    console.error('The production source and the tracked snapshot have drifted. Re-run --write (with owner review) to update.');
    process.exit(1);
  }

  // args.write
  if (!WRITABLE_CODES.includes(code)) {
    refuse(`--write is only approved for [${WRITABLE_CODES.join(', ')}] in ${SNAPSHOT_VERSION}; refusing to create unapproved path ${outRel}`);
  }
  if (existsSync(outPath)) {
    const tracked = readFileSync(outPath, 'utf8');
    if (tracked === generated) {
      console.log(`WRITE NO-OP — ${outRel} already matches current production.`);
      process.exit(0);
    }
    if (!args.force) {
      refuse(`${outRel} exists and differs from the generated snapshot; refusing to overwrite without --force`);
    }
  }
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, generated, 'utf8');
  console.log(`WROTE ${outRel} (${exchanges.length} exchanges).`);
  process.exit(0);
}

main();
