import { interpretResult } from "./interpretation.js";

const RESET  = "\x1b[0m";
const BOLD   = "\x1b[1m";
const CYAN   = "\x1b[36m";
const GREEN  = "\x1b[32m";
const YELLOW = "\x1b[33m";
const MAGENTA = "\x1b[35m";
const DIM    = "\x1b[2m";

function run(label: string, ...args: Parameters<typeof interpretResult>) {
  for (const lang of ["ko", "en"] as const) {
    console.log(`\n${BOLD}${CYAN}━━━ ${label} [${lang.toUpperCase()}] ━━━${RESET}`);
    const r = interpretResult(args[0], args[1], lang);
    console.log(`${BOLD}  summary   :${RESET} ${r.summary}`);
    if (r.hit !== undefined) {
      console.log(`${MAGENTA}  hit       :${RESET} ${(r.hit * 100).toFixed(1)}% (raw: ${r.hit.toFixed(4)})`);
    }
    console.log(`${GREEN}  footnote  :${RESET} ${r.footnote}`);
    console.log(`${YELLOW}  disclaimer:${RESET} ${DIM}${r.disclaimer}${RESET}`);
  }
}

console.log(`\n${BOLD}=== interpretation.ts Test Cases ===${RESET}`);

run("RR = 1.89 | CI [1.2, 2.8]",  "RR",          { value: 1.89, ci_lower: 1.2, ci_upper: 2.8 });
run("RR = 0.60 | CI [0.3, 1.1]",  "RR",          { value: 0.60, ci_lower: 0.3, ci_upper: 1.1 });
run("R0 = 0.80",                   "R0",          { value: 0.8 });
run("R0 = 2.50",                   "R0",          { value: 2.5 });
run("Sensitivity = 0.95",          "sensitivity", { value: 0.95 });
run("NNT = 8",                     "NNT",         { value: 8 });

console.log(`\n${BOLD}=== Done ===${RESET}\n`);
