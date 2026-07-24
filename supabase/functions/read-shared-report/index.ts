import { corsHeaders, jsonResponse, serviceClient } from "../_shared/auth.ts";

// 匿名可读，但对 not_found / revoked / expired 都统一返回 404 且响应体一致，
// 避免通过状态码或消息成为存在性 oracle。
const NOT_FOUND_RESPONSE = { error: "not_found" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST" && req.method !== "GET") return jsonResponse({ error: "method_not_allowed" }, 405);

  const url = new URL(req.url);
  let slug = url.searchParams.get("slug");
  if (!slug && req.method === "POST") {
    const body = await req.json().catch(() => ({}));
    slug = typeof body?.slug === "string" ? body.slug : null;
  }
  if (!slug || typeof slug !== "string" || slug.length < 6 || slug.length > 128) {
    return jsonResponse(NOT_FOUND_RESPONSE, 404);
  }

  const supabase = serviceClient();

  try {
    const { data, error } = await supabase
      .from("shared_reports")
      .select("title, snapshot, expires_at, revoked_at, created_at")
      .eq("slug", slug)
      .maybeSingle();
    if (error) {
      console.error("read_shared_failed", error);
      return jsonResponse({ error: "read_failed" }, 500);
    }
    if (!data) return jsonResponse(NOT_FOUND_RESPONSE, 404);
    if (data.revoked_at) return jsonResponse(NOT_FOUND_RESPONSE, 404);
    if (new Date(data.expires_at) < new Date()) return jsonResponse(NOT_FOUND_RESPONSE, 404);
    return jsonResponse({
      title: data.title,
      snapshot: data.snapshot,
      expires_at: data.expires_at,
      created_at: data.created_at,
    });
  } catch (err) {
    console.error("read_shared_unexpected", err);
    return jsonResponse({ error: "read_failed" }, 500);
  }
});
