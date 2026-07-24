import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { parseCsvText } from "../_shared/asset-normalize.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
};

const MAX_CSV_BYTES = 512 * 1024; // 512KB 上限
const MAX_ROWS = 500;

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return jsonResponse({ error: "missing_token" }, 401);
    const userRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/auth/v1/user`, {
      headers: { apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "", Authorization: authHeader },
    });
    if (!userRes.ok) return jsonResponse({ error: "invalid_token" }, 401);

    const { csv } = await req.json();
    if (!csv || typeof csv !== "string") return jsonResponse({ error: "missing_csv" }, 400);
    const byteLength = new TextEncoder().encode(csv).length;
    if (byteLength > MAX_CSV_BYTES) {
      return jsonResponse({ error: "csv_too_large", limit: MAX_CSV_BYTES }, 413);
    }

    const rows = parseCsvText(csv);
    if (rows.length === 0) return jsonResponse({ rows: [], summary: { total: 0, valid: 0, invalid: 0 } });
    if (rows.length > MAX_ROWS) {
      return jsonResponse({ error: "too_many_rows", limit: MAX_ROWS }, 413);
    }

    const valid = rows.filter((row) => row.errors.length === 0).length;
    const summary = { total: rows.length, valid, invalid: rows.length - valid };
    return jsonResponse({ rows, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: message }, 500);
  }
});
