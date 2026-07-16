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
  },
  resolve: {
    // Mirror tsconfig's "@/*" → "src/*" path alias.
    alias: { "@": path.resolve(__dirname, "src") },
  },
})
