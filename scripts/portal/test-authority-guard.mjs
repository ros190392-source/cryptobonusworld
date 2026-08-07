#!/usr/bin/env node
/**
 * Production test-authority guard (Issue #262, hardened per PR #263 owner review).
 *
 * Fail-closed static enforcement over `src/**`. The previous revision inspected only
 * the syntactic return-type ANNOTATION of exported functions, so an exported symbol
 * with an INFERRED evidence-producing return (a thin wrapper around
 * `adaptBybitOfferToEvidence`, or an object/class method) could escape. This revision
 * builds a real `ts.Program` + `TypeChecker` and reasons over RESOLVED module exports
 * and their ACTUAL types.
 *
 * Invariants enforced across every production module under `src/**`:
 *
 *   1. EvidenceMetadata-producer authority (R1–R4). An exported symbol "produces
 *      evidence" when it exposes a CALLABLE (directly, or via a reachable object/class
 *      member) whose RETURN type — after unwrapping `Promise<…>`/arrays and unions — is:
 *        (a) exactly the canonical `EvidenceMetadata` (by DECLARATION identity), or
 *        (b) transitively contains the authorizing `EvidenceAdaptResult` (identity), or
 *        (c) a RESULT-WRAPPER object carrying BOTH an `ok` discriminant AND an `evidence`
 *            payload whose type contains canonical `EvidenceMetadata`.
 *      A plain DATA value, or a DOMAIN record (e.g. an `Offer` with an `evidence` field
 *      but no `ok` discriminant), is deliberately NOT a producer — otherwise every data
 *      accessor would trip. Detection is identity-based (never "a type named
 *      EvidenceMetadata") and sees through inferred returns, named/aliased/star
 *      re-exports, arrow functions, and object/class methods.
 *
 *      The ONLY exports permitted to produce evidence are, by explicit auditable
 *      allowlist keyed on module + name:
 *        • `offerPacketResolution.ts :: adaptBybitOfferToEvidence` — the sole product
 *          packet→evidence AUTHORIZING adapter; and
 *        • `evidenceMetadata.ts :: resolveOfferEvidenceAuthorization` — a base validator
 *          in the canonical definition module that merely RE-validates/echoes
 *          caller-supplied evidence (it cannot mint offer authorization from a packet)
 *          and is structurally an `{ ok; evidence }` result, so it can only be told apart
 *          from a bypass by identity.
 *      Any OTHER producer fails: `EXTRA_EVIDENCE_PRODUCER`.
 *
 *   2. EvidenceAdaptResult authority. Only `adaptBybitOfferToEvidence` may return a type
 *      containing the packet→evidence authorizing result `EvidenceAdaptResult`. Any other
 *      producer fails: `EXTRA_ADAPT_RESULT_PRODUCER` (a crisp signal for the exact #262
 *      defect: a test adapter re-producing an authorizing result under a supplied policy).
 *
 *   3. Forbidden export names (R6) over RESOLVED exports (public name AND aliased target),
 *      case-insensitively: TEST_ONLY / ForTest / __test / testAdapter / syntheticPolicy /
 *      syntheticPartner / syntheticReceipt → `FORBIDDEN_EXPORT_NAME`.
 *
 *   4. Forbidden synthetic tokens (R6) anywhere in a production file: `test-partner-fixture`,
 *      `partner.test`, `TEST_ONLY_PROMO_CODE_POLICY`.
 *
 *   5. Production→test boundary (R5): no production source may reference a `test-support`
 *      module or `scripts/**` — via static import/export, dynamic `import(...)`, `require(...)`,
 *      or `import x = require(...)`. `.astro`/other non-TS src get a safe token/path scan.
 *
 * Performance: the expensive TypeChecker producer analysis is scoped to the small set of
 * `src/**` modules that could possibly yield evidence (files that textually reference the
 * evidence type / adapter / their modules) plus the two canonical anchors; every OTHER
 * `src/**` file still receives the syntactic token / boundary / forbidden-name scan, so
 * coverage remains total.
 *
 * Runs offline; no network; performs no emit. `runTestAuthorityGuard()` returns
 * `{ ok, violations }`. `runGuardSelfTests()` proves the detector against transient,
 * never-committed fixture trees (see scripts/portal/contracts-test.mjs guard/self/* cases).
 */
import ts from 'typescript';
import { readFileSync, readdirSync, statSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve, dirname, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const SRC = join(ROOT, 'src');

const REAL_EVIDENCE_META = join(SRC, 'data', 'contracts', 'evidenceMetadata.ts');
const REAL_ADAPTER_FILE = join(SRC, 'data', 'contracts', 'offerPacketResolution.ts');
const ADAPTER_NAME = 'adaptBybitOfferToEvidence';

/**
 * Explicit, auditable allowlist of `{ moduleAbsPath, exportName }` permitted to produce
 * evidence. Deliberately tiny; every entry is a documented base primitive or the sole
 * adapter. See header note (1).
 */
const EVIDENCE_PRODUCER_ALLOWLIST = [
  { file: REAL_ADAPTER_FILE, name: ADAPTER_NAME },
  { file: REAL_EVIDENCE_META, name: 'resolveOfferEvidenceAuthorization' },
];
/** Only the sole adapter may return the authorizing `EvidenceAdaptResult`. */
const ADAPT_RESULT_ALLOWLIST = [{ file: REAL_ADAPTER_FILE, name: ADAPTER_NAME }];

const FORBIDDEN_NAME = /test_only|fortest|__test|testadapter|syntheticpolicy|syntheticpartner|syntheticreceipt/i;
const FORBIDDEN_TEXT = [
  { re: /test-partner-fixture/, code: 'SYNTHETIC_PARTNER_IDENTITY_IN_SRC' },
  { re: /partner\.test/, code: 'SYNTHETIC_PARTNER_DOMAIN_IN_SRC' },
  { re: /TEST_ONLY_PROMO_CODE_POLICY/, code: 'TEST_ONLY_POLICY_IN_SRC' },
];
const BOUNDARY_SPEC = /(^|\/)test-support(\/|$)|(^|\/)scripts(\/|$)|portal\/test-support/;
/** A src/**.ts module can only YIELD evidence if it references one of these. */
const EVIDENCE_TRIGGER = /EvidenceMetadata|EvidenceAdaptResult|adaptBybitOfferToEvidence|offerPacketResolution|evidenceMetadata/;

const TS_EXT = /\.(ts|tsx)$/;
const D_TS = /\.d\.ts$/;
const NON_TRIGGER_SCAN_EXT = /\.(astro|js|jsx|mjs|cjs|vue|svelte)$/;

const MAX_TYPE_DEPTH = 8;    // transitive containment recursion bound
const MAX_MEMBER_DEPTH = 3;  // object/class member producer recursion bound
const PROMISE_ARRAY = new Set(['Promise', 'Array', 'ReadonlyArray', 'Awaited']);

const COMPILER_OPTIONS = {
  strict: true,
  skipLibCheck: true,
  resolveJsonModule: true,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  module: ts.ModuleKind.ESNext,
  target: ts.ScriptTarget.ES2022,
  jsx: ts.JsxEmit.Preserve,
  esModuleInterop: true,
  allowJs: false,
  noEmit: true,
  baseUrl: ROOT,
  paths: { '@/*': ['src/*'] },
};

function walk(dir, match) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = join(dir, e);
    let s;
    try {
      s = statSync(p);
    } catch {
      continue;
    }
    if (s.isDirectory()) out.push(...walk(p, match));
    else if (match(e, p)) out.push(p);
  }
  return out;
}

const norm = (p) => resolve(p).replace(/\\/g, '/').toLowerCase();
const relFromRoot = (p) => relative(ROOT, p).replace(/\\/g, '/');

function findSourceFile(program, absPath) {
  const target = norm(absPath);
  for (const sf of program.getSourceFiles()) if (norm(sf.fileName) === target) return sf;
  return undefined;
}

/** Resolve the declarations backing an exported name in a module file. */
function exportDecls(program, checker, absFile, exportName) {
  const sf = findSourceFile(program, absFile);
  if (!sf) return [];
  const mod = checker.getSymbolAtLocation(sf);
  if (!mod) return [];
  const ex = checker.getExportsOfModule(mod).find((e) => e.name === exportName);
  if (!ex) return [];
  let sym = ex;
  if (sym.flags & ts.SymbolFlags.Alias) {
    try {
      sym = checker.getAliasedSymbol(sym);
    } catch {
      /* keep alias symbol */
    }
  }
  return sym.declarations ?? [];
}

function symbolInDecls(type, targetDecls) {
  for (const sym of [type.aliasSymbol, type.symbol]) {
    if (sym && sym.declarations && sym.declarations.some((d) => targetDecls.has(d))) return true;
  }
  return false;
}

/** Type of a property symbol, tolerant of synthetic properties without a valueDeclaration. */
function typeOfProp(checker, prop) {
  const decl = prop.valueDeclaration ?? prop.declarations?.[0];
  if (decl) return checker.getTypeOfSymbolAtLocation(prop, decl);
  if (typeof checker.getTypeOfSymbol === 'function') return checker.getTypeOfSymbol(prop);
  return undefined;
}

/**
 * Does `type` transitively contain a declaration in `targetDecls`? Identity-based; used
 * for the nested "the `evidence` payload really is EvidenceMetadata" check.
 */
function typeContainsDecl(checker, type, targetDecls, visited, depth) {
  if (!type || depth > MAX_TYPE_DEPTH || visited.has(type)) return false;
  visited.add(type);
  if (symbolInDecls(type, targetDecls)) return true;
  if (type.isUnionOrIntersection && type.isUnionOrIntersection()) {
    for (const t of type.types) if (typeContainsDecl(checker, t, targetDecls, visited, depth + 1)) return true;
  }
  if (typeof checker.getTypeArguments === 'function' && type.target && type.target !== type) {
    for (const arg of checker.getTypeArguments(type)) if (typeContainsDecl(checker, arg, targetDecls, visited, depth + 1)) return true;
  }
  for (const prop of checker.getPropertiesOfType(type)) {
    const pt = typeOfProp(checker, prop);
    if (pt && typeContainsDecl(checker, pt, targetDecls, visited, depth + 1)) return true;
  }
  return false;
}

/** Visit union members and Promise/array type-arguments, applying `leaf` to each leaf type. */
function visitLeaves(checker, type, leaf, visited, depth) {
  if (!type || depth > MAX_TYPE_DEPTH || visited.has(type)) return false;
  visited.add(type);
  if (type.isUnionOrIntersection && type.isUnionOrIntersection()) {
    for (const t of type.types) if (visitLeaves(checker, t, leaf, visited, depth + 1)) return true;
    return false;
  }
  const name = type.symbol?.name ?? type.aliasSymbol?.name;
  if (name && PROMISE_ARRAY.has(name) && typeof checker.getTypeArguments === 'function' && type.target) {
    for (const arg of checker.getTypeArguments(type)) if (visitLeaves(checker, arg, leaf, visited, depth + 1)) return true;
    return false;
  }
  return leaf(type);
}

/**
 * Return-type predicate: does this callable RETURN produce the authorizing
 * EvidenceAdaptResult? EvidenceAdaptResult is itself a UNION type alias, so its identity
 * lives at the union level — check the alias at every level (never decompose it away)
 * while unwrapping Promise/array wrappers.
 */
function returnProducesAdaptResult(checker, type, adaptDecls, visited = new Set(), depth = 0) {
  if (!type || depth > MAX_TYPE_DEPTH || visited.has(type)) return false;
  visited.add(type);
  if (symbolInDecls(type, adaptDecls)) return true;
  const name = type.symbol?.name ?? type.aliasSymbol?.name;
  if (name && PROMISE_ARRAY.has(name) && typeof checker.getTypeArguments === 'function' && type.target) {
    for (const arg of checker.getTypeArguments(type)) if (returnProducesAdaptResult(checker, arg, adaptDecls, visited, depth + 1)) return true;
    return false;
  }
  if (type.isUnionOrIntersection && type.isUnionOrIntersection()) {
    for (const t of type.types) if (returnProducesAdaptResult(checker, t, adaptDecls, visited, depth + 1)) return true;
  }
  return false;
}

/** Return-type predicate: does this callable RETURN produce EvidenceMetadata (see header 1)? */
function returnProducesEvidence(checker, type, evidenceDecls, adaptDecls) {
  const leaf = (t) => {
    if (symbolInDecls(t, evidenceDecls)) return true;                 // (a) exactly EvidenceMetadata
    if (symbolInDecls(t, adaptDecls)) return true;                    // (b) EvidenceAdaptResult identity
    const props = checker.getPropertiesOfType(t);
    const hasOk = props.some((p) => p.name === 'ok');
    const ev = props.find((p) => p.name === 'evidence');
    if (hasOk && ev) {                                                // (c) result-wrapper { ok, evidence }
      const et = typeOfProp(checker, ev);
      if (et && typeContainsDecl(checker, et, evidenceDecls, new Set(), 0)) return true;
    }
    return false;
  };
  return visitLeaves(checker, type, leaf, new Set(), 0);
}

/**
 * Does the symbol expose a CALLABLE whose return type satisfies `predicate` — directly,
 * via a reachable object member, or via a class instance method? Plain data values are
 * never producers (only call/construct-signature returns are considered).
 */
function symbolHasProducingCallable(checker, sym, predicate) {
  const seen = new Set();
  const scan = (type, depth) => {
    if (!type || depth > MAX_MEMBER_DEPTH || seen.has(type)) return false;
    seen.add(type);
    for (const sig of checker.getSignaturesOfType(type, ts.SignatureKind.Call)) {
      if (predicate(checker.getReturnTypeOfSignature(sig))) return true;
    }
    for (const sig of checker.getSignaturesOfType(type, ts.SignatureKind.Construct)) {
      if (scan(checker.getReturnTypeOfSignature(sig), depth + 1)) return true; // constructed instance
    }
    for (const prop of checker.getPropertiesOfType(type)) {
      const pt = typeOfProp(checker, prop);
      if (pt && scan(pt, depth + 1)) return true;
    }
    return false;
  };
  const decl = sym.valueDeclaration ?? sym.declarations?.[0];
  if (!decl) return false;
  if (scan(checker.getTypeOfSymbolAtLocation(sym, decl), 0)) return true;
  if (sym.flags & ts.SymbolFlags.Class && scan(checker.getDeclaredTypeOfSymbol(sym), 0)) return true;
  return false;
}

function isAllowed(list, absFile, exportName) {
  const f = norm(absFile);
  return list.some((a) => norm(a.file) === f && a.name === exportName);
}

/** Recursive AST scan for forbidden production→test references in a TS source file. */
function scanBoundaryTs(sf, rel, violations) {
  const visit = (node) => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const spec = node.moduleSpecifier.text;
      if (BOUNDARY_SPEC.test(spec)) violations.push({ file: rel, code: ts.isExportDeclaration(node) ? 'TEST_SUPPORT_REEXPORTED' : 'PRODUCTION_IMPORTS_TEST_SUPPORT', message: `Production module references '${spec}'.` });
    }
    if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference) && node.moduleReference.expression && ts.isStringLiteral(node.moduleReference.expression)) {
      const spec = node.moduleReference.expression.text;
      if (BOUNDARY_SPEC.test(spec)) violations.push({ file: rel, code: 'PRODUCTION_IMPORTS_TEST_SUPPORT', message: `Production module import-equals references '${spec}'.` });
    }
    if (ts.isCallExpression(node)) {
      const isDynImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
      const isRequire = ts.isIdentifier(node.expression) && node.expression.text === 'require';
      if ((isDynImport || isRequire) && node.arguments.length && ts.isStringLiteral(node.arguments[0]) && BOUNDARY_SPEC.test(node.arguments[0].text)) {
        violations.push({ file: rel, code: 'PRODUCTION_IMPORTS_TEST_SUPPORT', message: `Production module ${isDynImport ? 'dynamic-imports' : 'requires'} '${node.arguments[0].text}'.` });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

/** Syntactic forbidden-export-name scan (fallback for modules outside the checker program). */
function scanExportNamesTs(sf, rel, violations) {
  const flag = (name, extra = '') => {
    if (FORBIDDEN_NAME.test(name)) violations.push({ file: rel, code: 'FORBIDDEN_EXPORT_NAME', message: `Export '${name}'${extra} matches a forbidden test-authority name.` });
  };
  const exported = (node) => (ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
  const visit = (node) => {
    if (exported(node)) {
      if ((ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isEnumDeclaration(node)) && node.name) flag(node.name.text);
      if (ts.isVariableStatement(node)) for (const d of node.declarationList.declarations) if (ts.isIdentifier(d.name)) flag(d.name.text);
    }
    if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
      for (const el of node.exportClause.elements) {
        flag(el.name.text);
        if (el.propertyName) flag(el.propertyName.text, ` (→ '${el.name.text}')`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

function scanTokens(text, rel, violations) {
  for (const { re, code } of FORBIDDEN_TEXT) if (re.test(text)) violations.push({ file: rel, code, message: 'Forbidden synthetic token present in production source.' });
}

/** Regex-only boundary + token scan for non-TS src formats (.astro, …). */
function scanNonTsFile(file, rel, violations) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    return;
  }
  scanTokens(text, rel, violations);
  const specRe = /(?:from\s*|import\s*\(\s*|require\s*\(\s*)['"]([^'"]+)['"]/g;
  let mm;
  while ((mm = specRe.exec(text)) !== null) if (BOUNDARY_SPEC.test(mm[1])) violations.push({ file: rel, code: 'PRODUCTION_IMPORTS_TEST_SUPPORT', message: `Production (non-TS) module references '${mm[1]}'.` });
}

function collectDecls(program, checker) {
  return {
    evidenceDecls: new Set(exportDecls(program, checker, REAL_EVIDENCE_META, 'EvidenceMetadata')),
    adaptDecls: new Set(exportDecls(program, checker, REAL_ADAPTER_FILE, 'EvidenceAdaptResult')),
  };
}

/**
 * Full checker-based analysis (producers + resolved forbidden names + boundary + tokens)
 * over the TS modules whose absolute path is under `analyzeUnder` or in `analyzeFiles`.
 */
function analyzeProgram(program, checker, { analyzeUnder, analyzeFiles, evidenceDecls, adaptDecls }) {
  const violations = [];
  if (evidenceDecls.size === 0) {
    violations.push({ file: relFromRoot(REAL_EVIDENCE_META), code: 'GUARD_CANNOT_RESOLVE_EVIDENCE_TYPE', message: 'Canonical EvidenceMetadata declaration could not be resolved; failing closed.' });
    return { ok: false, violations };
  }
  const underNorm = analyzeUnder ? norm(analyzeUnder) + '/' : null;
  const explicit = analyzeFiles ? new Set(analyzeFiles.map(norm)) : null;

  for (const sf of program.getSourceFiles()) {
    if (sf.isDeclarationFile) continue;
    const abs = norm(sf.fileName);
    if (explicit && !explicit.has(abs)) continue;
    if (underNorm && !abs.startsWith(underNorm)) continue;
    if (!explicit && !underNorm) continue;
    const rel = relFromRoot(sf.fileName);

    scanTokens(sf.text, rel, violations);
    scanBoundaryTs(sf, rel, violations);

    const mod = checker.getSymbolAtLocation(sf);
    if (!mod) continue;
    for (const exp of checker.getExportsOfModule(mod)) {
      const publicName = exp.name;
      let sym = exp;
      if (sym.flags & ts.SymbolFlags.Alias) {
        try {
          sym = checker.getAliasedSymbol(sym);
        } catch {
          /* keep */
        }
      }
      if (FORBIDDEN_NAME.test(publicName) || (sym.name && FORBIDDEN_NAME.test(sym.name))) {
        violations.push({ file: rel, code: 'FORBIDDEN_EXPORT_NAME', message: `Export '${publicName}'${sym.name && sym.name !== publicName ? ` (→ '${sym.name}')` : ''} matches a forbidden test-authority name.` });
      }
      if (!(sym.flags & ts.SymbolFlags.Value)) continue;

      if (symbolHasProducingCallable(checker, sym, (rt) => returnProducesAdaptResult(checker, rt, adaptDecls)) && !isAllowed(ADAPT_RESULT_ALLOWLIST, sf.fileName, publicName)) {
        violations.push({ file: rel, code: 'EXTRA_ADAPT_RESULT_PRODUCER', message: `Export '${publicName}' returns the authorizing EvidenceAdaptResult; only ${ADAPTER_NAME} may.` });
      }
      if (symbolHasProducingCallable(checker, sym, (rt) => returnProducesEvidence(checker, rt, evidenceDecls, adaptDecls)) && !isAllowed(EVIDENCE_PRODUCER_ALLOWLIST, sf.fileName, publicName)) {
        violations.push({ file: rel, code: 'EXTRA_EVIDENCE_PRODUCER', message: `Export '${publicName}' produces EvidenceMetadata; only ${ADAPTER_NAME} (+ the canonical base validator) may.` });
      }
    }
  }
  return { ok: violations.length === 0, violations };
}

/** Public entry point: analyze the REAL production `src/**` tree. */
export function runTestAuthorityGuard() {
  const allTs = walk(SRC, (e) => TS_EXT.test(e) && !D_TS.test(e));
  // Producer analysis is scoped to evidence-relevant modules (+ anchors); the rest of
  // src/** still gets the syntactic token/boundary/forbidden-name scan below.
  const triggerFiles = allTs.filter((f) => EVIDENCE_TRIGGER.test(readFileSync(f, 'utf8')));
  const rootNames = [...new Set([...triggerFiles, REAL_EVIDENCE_META, REAL_ADAPTER_FILE])];
  const program = ts.createProgram(rootNames, COMPILER_OPTIONS);
  const checker = program.getTypeChecker();
  const { evidenceDecls, adaptDecls } = collectDecls(program, checker);
  const { violations } = analyzeProgram(program, checker, { analyzeFiles: rootNames, evidenceDecls, adaptDecls });

  // Every remaining src/** TS module: syntactic tokens + boundary + forbidden export names.
  const analyzed = new Set(rootNames.map(norm));
  for (const f of allTs) {
    if (analyzed.has(norm(f))) continue;
    const text = readFileSync(f, 'utf8');
    const rel = relFromRoot(f);
    scanTokens(text, rel, violations);
    const sf = ts.createSourceFile(f, text, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
    scanBoundaryTs(sf, rel, violations);
    scanExportNamesTs(sf, rel, violations);
  }

  // Non-TS src formats (.astro, …): safe token + import-path scan.
  for (const f of walk(SRC, (e) => NON_TRIGGER_SCAN_EXT.test(e))) scanNonTsFile(f, relFromRoot(f), violations);

  return { ok: violations.length === 0, violations };
}

/* ------------------------------------------------------------------------- *
 * R7 — the guard self-tests. Constructs transient, NEVER-committed fixture
 * trees under the OS temp dir and proves the detector catches every bypass
 * form and accepts legitimate audit-only surfaces. Fixtures import the REAL
 * canonical types so identity-based detection is exercised end-to-end.
 * ------------------------------------------------------------------------- */
export function runGuardSelfTests() {
  const base = mkdtempSync(join(tmpdir(), 'cbw-guard-selftest-'));
  const cases = [];
  const write = (dir, name, body) => {
    const d = join(base, dir);
    mkdirSync(d, { recursive: true });
    writeFileSync(join(d, name), body, 'utf8');
  };
  const relTo = (fromDir, toAbs) => {
    let r = relative(join(base, fromDir), toAbs).replace(/\\/g, '/').replace(/\.tsx?$/, '');
    if (!r.startsWith('.')) r = './' + r;
    return r;
  };
  const evImp = (dir) => relTo(dir, REAL_EVIDENCE_META);
  const adImp = (dir) => relTo(dir, REAL_ADAPTER_FILE);
  const def = (id, desc, dir, files, expect) => {
    for (const [name, body] of Object.entries(files)) write(dir, name, body);
    cases.push({ id, desc, dir: join(base, dir), expect });
  };
  const hasCode = (v, code) => v.some((x) => x.code === code);
  const wantEvidence = (v) => hasCode(v, 'EXTRA_EVIDENCE_PRODUCER');
  const clean = (v) => v.length === 0;

  def('1', 'explicit EvidenceMetadata return rejected', 'c1',
    { 'm.ts': `import type { EvidenceMetadata } from '${evImp('c1')}';\nexport function mint(): EvidenceMetadata { return {} as EvidenceMetadata; }\n` }, wantEvidence);
  def('2', 'inferred { ok, evidence } result rejected', 'c2',
    { 'm.ts': `import type { EvidenceMetadata } from '${evImp('c2')}';\nexport function make() { return { ok: true as const, evidence: {} as EvidenceMetadata, resolution: {} as unknown }; }\n` }, wantEvidence);
  def('3', 'inferred wrapper around adaptBybitOfferToEvidence rejected', 'c3',
    { 'm.ts': `import { adaptBybitOfferToEvidence } from '${adImp('c3')}';\nexport function wrap(a: unknown, b: never[], c: number) { return adaptBybitOfferToEvidence(a, b, c); }\n` },
    wantEvidence);
  def('3b', 'explicit EvidenceAdaptResult return rejected (adapt-result signal)', 'c3b',
    { 'm.ts': `import type { EvidenceAdaptResult } from '${adImp('c3b')}';\nexport function forge(): EvidenceAdaptResult { return {} as EvidenceAdaptResult; }\n` },
    (v) => wantEvidence(v) && hasCode(v, 'EXTRA_ADAPT_RESULT_PRODUCER'));
  def('4', 'named export of producer rejected', 'c4',
    { 'm.ts': `import type { EvidenceMetadata } from '${evImp('c4')}';\nfunction mintNamed(): EvidenceMetadata { return {} as EvidenceMetadata; }\nexport { mintNamed };\n` }, wantEvidence);
  def('5', 'aliased export of producer rejected', 'c5',
    { 'm.ts': `import type { EvidenceMetadata } from '${evImp('c5')}';\nfunction mintLocal(): EvidenceMetadata { return {} as EvidenceMetadata; }\nexport { mintLocal as publicMint };\n` }, wantEvidence);
  def('6', 're-export of producer rejected', 'c6',
    {
      'helper.ts': `import type { EvidenceMetadata } from '${relTo('c6', REAL_EVIDENCE_META)}';\nexport function mintH(): EvidenceMetadata { return {} as EvidenceMetadata; }\n`,
      'm.ts': `export { mintH } from './helper';\n`,
    },
    (v) => v.some((x) => x.code === 'EXTRA_EVIDENCE_PRODUCER' && x.file.endsWith('c6/m.ts')));
  def('7', 'arrow function producer rejected', 'c7',
    { 'm.ts': `import type { EvidenceMetadata } from '${evImp('c7')}';\nexport const mintArrow = (): EvidenceMetadata => ({} as EvidenceMetadata);\n` }, wantEvidence);
  def('8', 'Promise<EvidenceMetadata> producer rejected', 'c8',
    { 'm.ts': `import type { EvidenceMetadata } from '${evImp('c8')}';\nexport async function mintAsync(): Promise<EvidenceMetadata> { return {} as EvidenceMetadata; }\n` }, wantEvidence);
  def('9', 'object method producer rejected', 'c9',
    { 'm.ts': `import type { EvidenceMetadata } from '${evImp('c9')}';\nexport const api = { produceEvidence(): EvidenceMetadata { return {} as EvidenceMetadata; } };\n` }, wantEvidence);
  def('10', 'class public method producer rejected', 'c10',
    { 'm.ts': `import type { EvidenceMetadata } from '${evImp('c10')}';\nexport class EvidenceFactory { make(): EvidenceMetadata { return {} as EvidenceMetadata; } }\n` }, wantEvidence);
  def('11', 'forbidden export name rejected', 'c11',
    { 'm.ts': `export const syntheticPolicyValue = 1;\nexport function buildForTest() { return 2; }\n` }, (v) => hasCode(v, 'FORBIDDEN_EXPORT_NAME'));
  def('12', 'static test-support import rejected', 'c12',
    { 'm.ts': `import { x } from './test-support/fixture';\nexport const y = x;\n` }, (v) => hasCode(v, 'PRODUCTION_IMPORTS_TEST_SUPPORT'));
  def('13', 'dynamic test-support import rejected', 'c13',
    { 'm.ts': `export async function load() { return import('./test-support/fixture'); }\n` }, (v) => hasCode(v, 'PRODUCTION_IMPORTS_TEST_SUPPORT'));
  def('14', 'require(scripts) rejected', 'c14',
    { 'm.ts': `declare const require: (s: string) => unknown;\nexport function load2() { return require('../../scripts/portal/test-support/fixture'); }\n` }, (v) => hasCode(v, 'PRODUCTION_IMPORTS_TEST_SUPPORT'));
  def('15', 'synthetic token in source rejected', 'c15',
    { 'm.ts': `export const note = 'test-partner-fixture reference';\n` }, (v) => hasCode(v, 'SYNTHETIC_PARTNER_IDENTITY_IN_SRC'));

  // Accepts — legitimate, non-producing surfaces must stay clean.
  def('a1', 'audit-only string helper accepted', 'a1',
    { 'm.ts': `export function digest(x: string): string { return x.slice(0, 8); }\nexport const LABEL = 'audit';\n` }, clean);
  def('a2', 'boolean-decision function accepted (deriveBybitOfferEvidence shape)', 'a2',
    { 'm.ts': `export function decide(): { ok: boolean; reason: string | null } { return { ok: false, reason: null }; }\n` }, clean);
  def('a3', 'validator returning { ok, value } (validateEvidenceMetadata shape) accepted', 'a3',
    { 'm.ts': `import type { EvidenceMetadata } from '${evImp('a3')}';\nexport function check(x: unknown): { ok: boolean; value?: EvidenceMetadata } { void x; return { ok: false }; }\n` }, clean);
  def('a4', 'domain accessor returning a record with an evidence field accepted', 'a4',
    { 'm.ts': `import type { EvidenceMetadata } from '${evImp('a4')}';\ninterface Offer { id: string; evidence: EvidenceMetadata | null; }\nexport function getOffer(): Offer { return { id: 'x', evidence: null }; }\n` }, clean);
  def('a5', 'data value typed EvidenceMetadata | null accepted (not a producer)', 'a5',
    { 'm.ts': `import type { EvidenceMetadata } from '${evImp('a5')}';\nexport const held: EvidenceMetadata | null = null;\n` }, clean);

  let ok = true;
  const results = [];
  try {
    const fixtureFiles = walk(base, (e) => TS_EXT.test(e));
    const program = ts.createProgram([...fixtureFiles, REAL_EVIDENCE_META, REAL_ADAPTER_FILE], COMPILER_OPTIONS);
    const checker = program.getTypeChecker();
    const { evidenceDecls, adaptDecls } = collectDecls(program, checker);
    for (const c of cases) {
      const { violations } = analyzeProgram(program, checker, { analyzeUnder: c.dir, evidenceDecls, adaptDecls });
      let pass = false;
      try {
        pass = !!c.expect(violations);
      } catch {
        pass = false;
      }
      if (!pass) ok = false;
      results.push({ id: c.id, desc: c.desc, pass, codes: violations.map((v) => v.code) });
    }
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
  return { ok, results };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const args = new Set(process.argv.slice(2));
  if (args.has('--self-test')) {
    const { ok, results } = runGuardSelfTests();
    for (const r of results) console.log(`  ${r.pass ? 'PASS' : 'FAIL'} guard/self/${r.id}: ${r.desc}${r.pass ? '' : ` [codes: ${r.codes.join(',') || 'none'}]`}`);
    console.log(ok ? 'PASS: guard self-tests' : 'FAIL: guard self-tests');
    process.exit(ok ? 0 : 1);
  }
  const { ok, violations } = runTestAuthorityGuard();
  if (ok) {
    console.log(`PASS: test-authority guard — ${ADAPTER_NAME} is the sole EvidenceMetadata/EvidenceAdaptResult producer; no synthetic authority or test-support boundary crossing in src/**.`);
    process.exit(0);
  }
  console.error('FAIL: test-authority guard violations:');
  for (const v of violations) console.error(`  [${v.code}] ${v.file}: ${v.message}`);
  process.exit(1);
}
