import { defineConfig } from "vitest/config"
import path from "node:path"

// No @vitejs/plugin-react: vitest 4 transforms TSX natively (oxc, automatic
// JSX). The react plugin only adds dev-server HMR/fast-refresh, and its
// current release peer-depends on @babel/core 8 while shadcn pins Babel 7.
export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    // Base UI Sheet/Dialog tests drive real open/close transitions, and jsdom
    // environment setup for 53 files is already heavy. At vitest's 5s default
    // these time out roughly one run in six on a busy machine — the failures
    // are always "Test timed out in 5000ms", never an assertion. CI runners are
    // slower than a dev laptop, so the default would flake there routinely.
    testTimeout: 20000,
  },
  resolve: {
    // Mirror tsconfig's "@/*" → "src/*" path alias.
    alias: { "@": path.resolve(__dirname, "src") },
  },
})
