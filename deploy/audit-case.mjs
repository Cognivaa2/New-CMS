// Case-sensitivity import audit (works on case-insensitive Windows by comparing
// against real on-disk casing via readdir). Scans Frontend/src (alias @/ -> src/)
// and Backend (relative imports). Reports every import whose path casing differs
// from the actual file/dir on disk (i.e. would break on Linux/CI).
import fs from "fs";
import path from "path";

const REPO = process.argv[2] || ".";
const EXTS = ["", ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".json", ".css"];
const IDX = ["index.js", "index.jsx", "index.ts", "index.tsx"];

function listFiles(dir) {
  const out = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === "node_modules" || e.name === ".git" || e.name === ".next" || e.name === ".open-next") continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(jsx?|tsx?|mjs|cjs)$/.test(e.name)) out.push(p);
    }
  })(dir);
  return out;
}

// returns true if every segment of `abs` (below `root`) exists with EXACT case
function caseExact(root, abs) {
  let cur = root;
  const rel = path.relative(root, abs);
  if (rel.startsWith("..")) return null; // outside root, skip
  for (const seg of rel.split(path.sep)) {
    if (!seg) continue;
    let entries;
    try { entries = fs.readdirSync(cur); } catch { return false; }
    if (!entries.includes(seg)) return false; // case-insensitive FS but exact string compare
    cur = path.join(cur, seg);
  }
  return true;
}

function resolveCandidates(baseAbs) {
  const c = [];
  for (const ext of EXTS) c.push(baseAbs + ext);
  for (const i of IDX) c.push(path.join(baseAbs, i));
  return c;
}

function audit(label, root, aliasRoot) {
  const files = listFiles(root);
  const re = /(?:import|export)[^'"]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|require\(\s*['"]([^'"]+)['"]\s*\)|import\s*['"]([^'"]+)['"]/g;
  const issues = [];
  for (const f of files) {
    const src = fs.readFileSync(f, "utf8");
    let m;
    while ((m = re.exec(src))) {
      const spec = m[1] || m[2] || m[3] || m[4];
      if (!spec) continue;
      let baseAbs;
      if (spec.startsWith("@/") && aliasRoot) baseAbs = path.join(aliasRoot, spec.slice(2));
      else if (spec.startsWith("./") || spec.startsWith("../")) baseAbs = path.resolve(path.dirname(f), spec);
      else continue; // bare package import
      // find the resolved candidate that exists (case-insensitively), then check exact case
      const checkRoot = spec.startsWith("@/") ? aliasRoot : root;
      let resolved = null;
      for (const cand of resolveCandidates(baseAbs)) {
        if (fs.existsSync(cand)) { resolved = cand; break; }
      }
      if (!resolved) continue; // unresolved (could be alias to other root); skip
      const exact = caseExact(checkRoot, resolved);
      if (exact === false) {
        issues.push({ importer: path.relative(REPO, f), spec, resolvedActual: path.relative(REPO, resolved) });
      }
    }
  }
  console.log(`\n=== ${label}: ${issues.length} case mismatch(es) ===`);
  for (const i of issues) console.log(`  ${i.importer}\n     import "${i.spec}"  ->  actual: ${i.resolvedActual}`);
}

audit("FRONTEND", path.join(REPO, "Frontend", "src"), path.join(REPO, "Frontend", "src"));
audit("BACKEND", path.join(REPO, "Backend"), null);
