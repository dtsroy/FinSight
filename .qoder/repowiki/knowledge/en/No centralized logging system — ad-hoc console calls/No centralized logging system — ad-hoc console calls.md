---
kind: logging_system
name: No centralized logging system — ad-hoc console calls
category: logging_system
scope:
    - '**'
source_files:
    - src/services/fxService.ts
    - src/components/ui/svg/svg-icon.tsx
    - src/pages/NotFound.tsx
    - supabase/functions/ai-doctor-chat/index.ts
    - supabase/functions/compute-xray-report/index.ts
    - supabase/functions/get-fx-rates/index.ts
---

This repository does not implement a structured logging system. There is no dedicated logger library, log-level configuration, or centralized logging module. Instead, the codebase uses plain `console.log` / `console.warn` / `console.error` calls scattered across both the React frontend (`src/services/fxService.ts`, `src/components/ui/svg/svg-icon.tsx`, `src/pages/NotFound.tsx`) and Supabase Edge Functions (`supabase/functions/ai-doctor-chat/index.ts`, `supabase/functions/compute-xray-report/index.ts`, `supabase/functions/get-fx-rates/index.ts`, etc.).

Observed conventions:
- Error paths use `console.error("<snake_case_event_name>", errorPayload)` with a short descriptive event tag followed by the raw error object.
- Warning paths use `console.warn("<event_tag>", ...)` for non-fatal issues (e.g. upstream HTTP failures).
- No `console.info` / `console.debug` usage was found; informational output appears to be absent.
- Log messages are human-readable strings rather than structured JSON objects, so they cannot be parsed into fields like timestamp, level, user_id, correlation_id, etc.
- There is no global error handler, no log sink abstraction, and no environment-based log-level gating.

As a result, this category does not apply as an established system in this repo.