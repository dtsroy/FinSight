---
kind: external_dependency
name: Superun AI Gateway (Vision + Reasoning models)
slug: superun-ai-gateway
category: external_dependency
category_hints:
    - vendor_identity
scope:
    - '**'
---

### Identity
Superun AI Gateway is the external LLM/vision provider powering two capabilities:
- `superun-vision-flash`: OCR + UI-feature extraction for holding screenshots.
- `superun-think-pro`: conversational financial-advisor reasoning model with SSE streaming.

### Role in this repo
- Vision flow: `supabase/functions/recognize-holdings-ocr/` calls Superun vision to extract amounts, institution identity, and stock/fund codes from uploaded images.
- Chat flow: `supabase/functions/ai-doctor-chat/` streams responses from Superun's think-pro model, combining user asset snapshot + risk disclaimers + role prompt.

### Usage model
Both are invoked server-side from Edge Functions; the frontend only receives structured JSON or streamed SSE text. Secrets (API keys) are injected into the Edge Function runtime, not exposed to the browser.

Verify exact API endpoints and streaming protocol against Superun's official docs.