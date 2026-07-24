---
kind: build_system
name: Vite + React SPA Build Pipeline
category: build_system
scope:
    - '**'
source_files:
    - package.json
    - vite.config.ts
    - tsconfig.json
    - tsconfig.app.json
    - tsconfig.node.json
    - tailwind.config.js
    - postcss.config.js
---

The project uses a straightforward Vite-based build pipeline for a single-tenant React/TypeScript desktop application. There is no Makefile, Dockerfile, CI configuration, or cross-compilation setup present in the repository.

**Build toolchain**
- **Bundler**: Vite 6 with `@vitejs/plugin-react` for JSX/TSX compilation and HMR during development (`pnpm dev`).
- **Production build**: `pnpm build` runs `vite build`, which invokes Rollup under the hood to emit static assets into the default `dist/` directory.
- **Preview**: `pnpm preview` serves the built output locally via Vite's preview server.
- **Linting**: `pnpm lint` delegates to ESLint (no custom rules file visible at root).

**Dependency management**
- Package manager: pnpm (lockfile `pnpm-lock.yaml`).
- Runtime deps include React 18, Radix UI primitives, Tailwind CSS, Supabase JS client, Recharts, Framer Motion, Three.js ecosystem, and others.
- Dev deps pin Vite 6, TypeScript 5, PostCSS, Autoprefixer, and Tailwind 3.4.

**TypeScript configuration**
- Project references split into `tsconfig.app.json` (browser app) and `tsconfig.node.json` (build/tooling), referenced from the root `tsconfig.json`.
- Path alias `@/*` → `./src/*` is declared in both `tsconfig.json` and mirrored in `vite.config.ts` `resolve.alias` so IDEs and Vite resolve consistently.

**Asset & chunk strategy**
- `vite.config.ts` defines manual Rollup chunks: `vendor` (react, react-dom, recharts) and `ui` (lucide-react, framer-motion) to improve long-term caching of heavy third-party code.
- `optimizeDeps.include` pre-bundles `lucide-react`, `framer-motion`, and `recharts` to speed up cold starts.

**Styling pipeline**
- Tailwind CSS 3 with `tailwindcss-animate` plugin; dark mode toggled via class strategy (`darkMode: "class"`).
- Shadcn/ui components live under `src/components/ui/`; `components.json` (not shown) drives their generation.
- PostCSS config exists at root (`postcss.config.js`) but its contents were not inspected.

**What is NOT present**
- No `Makefile`, shell build scripts, `Dockerfile`, or `docker-compose.yml`.
- No CI/CD pipelines (`.github/workflows`, `.circleci`, Jenkinsfile, Bitbucket Pipelines, etc.).
- No explicit versioning/release automation — `package.json` version is pinned at `0.0.0`.
- No Electron/Tauri/WASM cross-compilation targets; this is a pure web SPA build.