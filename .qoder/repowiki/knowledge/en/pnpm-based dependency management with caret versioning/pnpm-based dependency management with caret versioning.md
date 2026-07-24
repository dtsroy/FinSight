---
kind: dependency_management
name: pnpm-based dependency management with caret versioning
category: dependency_management
scope:
    - '**'
source_files:
    - package.json
    - pnpm-lock.yaml
---

The project uses **pnpm** as its package manager for a single-tenant Vite + React desktop application. All third-party dependencies are declared in the root `package.json` and pinned to exact resolved versions by the committed `pnpm-lock.yaml` (lockfileVersion 9.0).

**System and tooling**
- Package manager: pnpm (no `.npmrc`, no private registry, no workspace config found).
- Version strategy: caret (`^`) ranges in `package.json`, allowing minor/patch upgrades while keeping major versions stable.
- Lockfile: `pnpm-lock.yaml` is committed, ensuring deterministic installs across machines and CI.
- No vendoring or subdirectory `package.json` files — this is a flat, single-root dependency graph.

**Key files**
- `package.json` — declares runtime dependencies (React 18, Radix UI primitives, Supabase JS client, Three.js ecosystem, date-fns, recharts, framer-motion, zod, etc.) and devDependencies (Vite, TypeScript, Tailwind, PostCSS, Babel, qiniu SDK).
- `pnpm-lock.yaml` — frozen snapshot of every transitive dependency tree; used as the source of truth for reproducible builds.

**Architecture and conventions**
- All packages live at the repository root; there are no per-feature or per-service `package.json` manifests.
- Dependencies are grouped into `dependencies` vs `devDependencies` following standard npm/pnpm conventions.
- Peer dependencies are auto-resolved (`autoInstallPeers: true`), so packages like `@radix-ui/*` that declare peer deps on React do not require manual installation.
- No private npm registry or proxy configuration was detected; the default public npm registry is used.

**Rules developers should follow**
- Always run `pnpm install` after pulling changes so the lockfile is applied consistently.
- Add new packages via `pnpm add <pkg>` / `pnpm add -D <pkg>` rather than editing `package.json` manually, so the lockfile stays in sync.
- Keep version specifiers as caret ranges (`^x.y.z`) unless a breaking change is intentional; avoid pinning to exact versions in `package.json`.
- Do not commit `node_modules`; rely on the lockfile for reproducibility.
- If introducing a private/internal package, configure a `.npmrc` or pnpm registry alias before adding it to `package.json`.