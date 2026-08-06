#!/usr/bin/env node
/**
 * Production test-authority guard (Issue #262, R3 + R5).
 *
 * Fail-closed static enforcement over `src/**`:
 *   R3.1  ONLY `adaptBybitOfferToEvidence` may return an authorizing EvidenceMetadata
 *         result (`EvidenceAdaptResult` / a bare `EvidenceMetadata`); any other exported
 *         function that does is a violation. (AST return-type inspection via the
 *         TypeScript compiler API — not a fragile whole-file substring check.)
 *   R3.2  no exported declaration name may include TEST_ONLY / ForTest / testAdapter /
 *         syntheticPolicy.
 *   R3.3  no production file may contain the known synthetic partner identity/domain
 *         (`test-partner-fixture`, `partner.test`) or `TEST_ONLY_PROMO_CODE_POLICY`.
 *   R3.4 / R5  no production source may import from `scripts/**` or a test-support module.
 *   R3.5  test-support must not be re-exported by a production barrel.
 *
 * Runs offline; no network. `runTestAuthorityGuard()` returns { ok, violations }.
 */
import ts from 'typescript';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const SRC = join(ROOT, 'src');

const FORBIDDEN_NAME = /TEST_ONLY|ForTest|testAdapter|syntheticPolicy/;
const FORBIDDEN_TEXT = [
  { re: /test-partner-fixture/, code: 'SYNTHETIC_PARTNER_IDENTITY_IN_SRC' },
  { re: /partner\.test/, code: 'SYNTHETIC_PARTNER_DOMAIN_IN_SRC' },
  { re: /TEST_ONLY_PROMO_CODE_POLICY/, code: 'TEST_ONLY_POLICY_IN_SRC' },
];
// The ONE authorizing EvidenceMetadata producer.
const SOLE_EVIDENCE_PRODUCER = 'adaptBybitOfferToEvidence';
// Authorizing result types: producing one of these = producing EvidenceMetadata.
const EVIDENCE_PRODUCER_RETURN = /\bEvidenceAdaptResult\b|(^|[^A-Za-z])EvidenceMetadata\b/;

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx)$/.test(e) && !/\.d\.ts$/.test(e)) out.push(p);
  }
  return out;
}

function isExported(node) {
  const mods = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
  return !!mods && mods.some((mod) => mod.kind === ts.SyntaxKind.ExportKeyword);
}

export function runTestAuthorityGuard() {
  const violations = [];
  const files = walk(SRC);

  for (const file of files) {
    const rel = relative(ROOT, file).replace(/\\/g, '/');
    const text = readFileSync(file, 'utf8');

    // R3.3 — forbidden synthetic text anywhere in production.
    for (const { re, code } of FORBIDDEN_TEXT) {
      if (re.test(text)) violations.push({ file: rel, code, message: `Forbidden synthetic token present in production source.` });
    }

    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);

    const visit = (node) => {
      // R3.4 / R5 — no production import from scripts/** or a test-support module.
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        const spec = node.moduleSpecifier.text;
        if (/(^|\/)test-support(\/|$)/.test(spec) || /(^|\/)scripts(\/|$)/.test(spec) || spec.includes('portal/test-support')) {
          violations.push({ file: rel, code: ts.isExportDeclaration(node) ? 'TEST_SUPPORT_REEXPORTED' : 'PRODUCTION_IMPORTS_TEST_SUPPORT', message: `Production module references '${spec}'.` });
        }
      }

      // Exported declarations: name + (functions) return-type checks.
      if (isExported(node)) {
        // Collect declared names.
        const names = [];
        if ((ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isEnumDeclaration(node)) && node.name) names.push(node.name.text);
        if (ts.isVariableStatement(node)) for (const d of node.declarationList.declarations) if (ts.isIdentifier(d.name)) names.push(d.name.text);
        for (const n of names) {
          if (FORBIDDEN_NAME.test(n)) violations.push({ file: rel, code: 'FORBIDDEN_EXPORT_NAME', message: `Exported '${n}' matches a forbidden test-authority name.` });
        }

        // R3.1 — only adaptBybitOfferToEvidence may return an authorizing evidence result.
        if (ts.isFunctionDeclaration(node) && node.name) {
          const rt = node.type ? node.type.getText(sf) : '';
          if (EVIDENCE_PRODUCER_RETURN.test(rt) && node.name.text !== SOLE_EVIDENCE_PRODUCER) {
            violations.push({ file: rel, code: 'EXTRA_EVIDENCE_PRODUCER', message: `Exported function '${node.name.text}' returns '${rt}' — only ${SOLE_EVIDENCE_PRODUCER} may produce EvidenceMetadata.` });
          }
        }
        // Exported arrow/function assigned to a const with an evidence-producing return type.
        if (ts.isVariableStatement(node)) {
          for (const d of node.declarationList.declarations) {
            const init = d.initializer;
            if (init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) && init.type) {
              const rt = init.type.getText(sf);
              const nm = ts.isIdentifier(d.name) ? d.name.text : '';
              if (EVIDENCE_PRODUCER_RETURN.test(rt) && nm !== SOLE_EVIDENCE_PRODUCER) {
                violations.push({ file: rel, code: 'EXTRA_EVIDENCE_PRODUCER', message: `Exported '${nm}' returns '${rt}' — only ${SOLE_EVIDENCE_PRODUCER} may produce EvidenceMetadata.` });
              }
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }

  return { ok: violations.length === 0, violations };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const { ok, violations } = runTestAuthorityGuard();
  if (ok) { console.log('PASS: test-authority guard — production src/** contains no synthetic authority; adaptBybitOfferToEvidence is the sole EvidenceMetadata producer.'); process.exit(0); }
  console.error('FAIL: test-authority guard violations:');
  for (const v of violations) console.error(`  [${v.code}] ${v.file}: ${v.message}`);
  process.exit(1);
}
