import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // `npm run lint` invokes eslint with no args, so it walks the whole tree
    // from the repo root. Agent worktrees live in .claude/worktrees/*, each
    // with its own node_modules and .next — without these, linting the main
    // checkout tries to parse every worktree's build output and effectively
    // never finishes. The patterns above are root-relative and don't cover
    // nested copies, hence the explicit `**/` forms.
    ".claude/**",
    "**/.next/**",
    // Flat config does NOT read .gitignore, so gitignored directories are
    // still linted. This one is a local-only stash of old/live-site components
    // kept for reference — it is not our code and accounts for every lint
    // problem the main checkout reports (76 of 76).
    "reference-components/**",
  ]),
]);

export default eslintConfig;
