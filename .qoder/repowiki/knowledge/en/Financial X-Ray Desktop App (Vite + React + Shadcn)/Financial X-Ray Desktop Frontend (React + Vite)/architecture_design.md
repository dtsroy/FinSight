Vite-driven React app bootstrapped from `src/main.tsx` → `App.tsx`, which wires `react-router-dom` v6 data router (`createBrowserRouter`) with a top-level `RootLayout` plus an `AuthGate`-wrapped `AppLayout` that renders the sidebar navigation and `<Outlet />`. The module is layered vertically:

- `pages/desktop/*` — route entry components (Dashboard, Assets, Import, XRay, StressTest, Chat, Landing, SharedReport).
- `components/desktop/*` — page-specific UI; `components/ui/*` — shadcn-derived primitives (button, dialog, table, form, etc.) consumed via Tailwind classes; `components/ui/svg/*` — typed SVG icon helpers.
- `layouts/desktop/AppLayout.tsx` — shared chrome (sidebar nav, account menu) used by every authenticated route.
- `hooks/*` — thin React Query wrappers around `services/*`; each hook owns a stable query key prefix (e.g. `ASSET_KEYS`) and invalidates on mutation via `useQueryClient.invalidateQueries({ queryKey: ["assets"] })`.
- `services/*` — pure async functions calling `@/integrations/supabase/client` (`supabase-js`); they translate DB rows to domain types in `types/app/*` and enforce per-row/user scoping through a local `requireUserId()` helper.
- `integrations/supabase/client.ts` — auto-generated Supabase client configured with `localStorage` session persistence and `autoRefreshToken`; `types.ts` holds the generated `Database` type.
- `lib/*` — framework-free utilities (`currency.ts`, `asset-format.ts`, `utils.ts`).

Dependency direction is strictly one-way: pages → hooks → services → supabase client; components depend only on `ui/*` and `lib/*`. No cross-service imports exist between sibling service files.