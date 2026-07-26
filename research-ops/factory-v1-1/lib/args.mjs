// ResearchOps Factory V1.1 — strict argument parser. Dependency-free.
// Rejects unknown flags, duplicate flags and missing values.

export function parseArgs(argv, spec) {
  // spec: { flags: { '--name': { required, aliasKey } },
  //         booleans: { '--flag': { aliasKey } } | Set<'--flag'> }
  const out = {};
  const seen = new Set();
  const flags = spec.flags || {};
  const booleansSpec = spec.booleans || {};
  const booleanNames = booleansSpec instanceof Set ? booleansSpec : new Set(Object.keys(booleansSpec));
  const boolAlias = (name) => (booleansSpec instanceof Set ? undefined : booleansSpec[name]?.aliasKey);

  for (let i = 0; i < argv.length; i += 1) {
    const tok = argv[i];
    if (!tok.startsWith('--')) {
      throw new Error(`unexpected positional argument: ${tok}`);
    }
    let name = tok;
    let inlineVal = null;
    const eq = tok.indexOf('=');
    if (eq !== -1) {
      name = tok.slice(0, eq);
      inlineVal = tok.slice(eq + 1);
    }
    if (!(name in flags) && !booleanNames.has(name)) {
      throw new Error(`unknown flag: ${name}`);
    }
    if (seen.has(name)) {
      throw new Error(`duplicate flag: ${name}`);
    }
    seen.add(name);

    if (booleanNames.has(name)) {
      if (inlineVal !== null && inlineVal !== 'true' && inlineVal !== 'false') {
        throw new Error(`boolean flag ${name} takes true/false, got ${inlineVal}`);
      }
      out[boolAlias(name) || name.slice(2)] = inlineVal !== 'false';
      continue;
    }

    let value = inlineVal;
    if (value === null) {
      value = argv[i + 1];
      if (value === undefined || value.startsWith('--')) {
        throw new Error(`missing value for flag: ${name}`);
      }
      i += 1;
    }
    out[flags[name].aliasKey || name.slice(2)] = value;
  }

  for (const [name, def] of Object.entries(flags)) {
    const key = def.aliasKey || name.slice(2);
    if (def.required && !(key in out)) {
      throw new Error(`missing required flag: ${name}`);
    }
  }
  return out;
}
