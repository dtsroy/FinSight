import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
};

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

const ALLOWED_CONTENT_TYPES: Record<"csv" | "screenshots", string[]> = {
  csv: ["text/csv", "application/vnd.ms-excel", "text/plain"],
  screenshots: ["image/png", "image/jpeg", "image/webp"],
};

const ALLOWED_EXTENSIONS: Record<"csv" | "screenshots", RegExp> = {
  csv: /^(csv|txt)$/i,
  screenshots: /^(png|jpe?g|webp)$/i,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) return jsonResponse({ error: "missing_token" }, 401);

    const userRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/auth/v1/user`, {
      headers: {
        apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        Authorization: authHeader,
      },
    });
    if (!userRes.ok) return jsonResponse({ error: "invalid_token" }, 401);
    const { id: userId } = await userRes.json();
    if (!userId) return jsonResponse({ error: "no_user" }, 401);

    const body = await req.json().catch(() => ({}));
    const folder: "csv" | "screenshots" = body.folder === "screenshots" ? "screenshots" : body.folder === "csv" ? "csv" : "csv";
    const contentType = (body.contentType || "").toString().toLowerCase();
    if (!ALLOWED_CONTENT_TYPES[folder].includes(contentType)) {
      return jsonResponse({ error: "unsupported_content_type", allowed: ALLOWED_CONTENT_TYPES[folder] }, 415);
    }
    const rawExtension = (body.extension || "").toString().replace(/[^a-z0-9]/gi, "").slice(0, 8);
    if (!ALLOWED_EXTENSIONS[folder].test(rawExtension)) {
      return jsonResponse({ error: "unsupported_extension", allowed: ALLOWED_EXTENSIONS[folder].source }, 415);
    }

    const date = new Date();
    const dateFolder = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const randomId = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    const key = `xray/${userId}/${folder}/${dateFolder}/${randomId}.${rawExtension.toLowerCase()}`;

    const bucket = Deno.env.get("SUPERUN_STORAGE_BUCKET");
    if (!bucket) return jsonResponse({ error: "storage_not_configured" }, 500);

    const response = await fetch("https://gateway.superun.ai/oss/s3/pre-signed-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bucket, key, expiresIn: 900, contentType }),
    });

    const payload = await response.json();
    const { uploadUrl, downloadUrl, contentType: resolvedContentType } = payload?.data ?? {};
    if (!uploadUrl || !downloadUrl) return jsonResponse({ error: "presign_failed" }, 500);

    return jsonResponse({ uploadUrl, downloadUrl, contentType: resolvedContentType, key });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: message }, 500);
  }
});
