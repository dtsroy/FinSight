import { supabase } from "@/integrations/supabase/client";
import { toValidCurrency } from "@/lib/currency";
import type { ImportBatch, ParseSummary, ParsedAssetRow } from "@/types/app/asset";

interface BatchRow {
  id: string;
  source: ImportBatch["source"];
  status: ImportBatch["status"];
  imported_count: number;
  failed_count: number;
  file_url: string | null;
  note: string | null;
  created_at: string;
}

const toBatch = (row: BatchRow): ImportBatch => ({
  id: row.id,
  source: row.source,
  status: row.status,
  imported: row.imported_count,
  failed: row.failed_count,
  fileUrl: row.file_url,
  note: row.note,
  createdAt: row.created_at,
});

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user?.id;
  if (!userId) throw new Error("未登录");
  return userId;
}

interface PresignResult { uploadUrl: string; downloadUrl: string; contentType: string; key: string }

async function requestPresignedUrl(folder: "csv" | "screenshots", extension: string, contentType: string): Promise<PresignResult> {
  const { data, error } = await supabase.functions.invoke("s3-pre-sign-url", {
    body: { folder, extension, contentType },
  });
  if (error) throw error;
  const payload = data as PresignResult | undefined;
  if (!payload?.uploadUrl || !payload.downloadUrl) throw new Error("获取上传地址失败");
  return payload;
}

export async function uploadToStorage(file: File, folder: "csv" | "screenshots"): Promise<{ url: string; key: string }> {
  const extension = file.name.split(".").pop()?.toLowerCase() || (folder === "csv" ? "csv" : "png");
  const presigned = await requestPresignedUrl(folder, extension, file.type || "application/octet-stream");
  const response = await fetch(presigned.uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": presigned.contentType },
  });
  if (!response.ok) throw new Error(`上传失败：${response.status}`);
  return { url: presigned.downloadUrl, key: presigned.key };
}

export async function parseCsv(csvText: string): Promise<{ rows: ParsedAssetRow[]; summary: ParseSummary }> {
  const { data, error } = await supabase.functions.invoke("parse-asset-csv", { body: { csv: csvText } });
  if (error) throw error;
  const payload = data as { rows: ParsedAssetRow[]; summary: ParseSummary } | undefined;
  if (!payload) throw new Error("解析失败");
  return payload;
}

export async function recognizeHoldings(imageUrl: string, platformHint?: string): Promise<{ rows: ParsedAssetRow[]; summary: ParseSummary }> {
  const { data, error } = await supabase.functions.invoke("recognize-holdings-ocr", {
    body: { imageUrl, platformHint },
  });
  if (error) throw error;
  const payload = data as { rows: ParsedAssetRow[]; summary: ParseSummary } | undefined;
  if (!payload) throw new Error("识别失败");
  return payload;
}

export async function seedDemoPortfolio(): Promise<{ status: string; imported: number }> {
  const { data, error } = await supabase.functions.invoke("seed-demo-portfolio", { body: {} });
  if (error) throw error;
  const payload = data as { status: string; imported: number } | undefined;
  if (!payload) throw new Error("载入演示失败");
  return payload;
}

interface CommitBatchArgs {
  source: "csv" | "ocr";
  rows: ParsedAssetRow[];
  fileUrl?: string | null;
  fileKey?: string | null;
  note?: string | null;
  failedCount?: number;
}

export async function commitParsedBatch({ source, rows, fileUrl, fileKey, note, failedCount = 0 }: CommitBatchArgs): Promise<ImportBatch> {
  await requireUserId();
  const validRows = rows.filter((row) => row.errors.length === 0);
  const payload = validRows.map((row) => ({
    name: row.name.trim(),
    category: row.category,
    platform: row.platform.trim(),
    amount: row.amount,
    currency: toValidCurrency(row.currency),
    code: row.code?.trim() || null,
    note: row.note?.trim() || null,
  }));

  const { data, error } = await supabase.rpc("commit_import_batch", {
    p_source: source,
    p_rows: payload,
    p_failed_count: Math.max(failedCount, rows.length - validRows.length),
    p_file_url: fileUrl ?? null,
    p_file_key: fileKey ?? null,
    p_note: note ?? null,
  });
  if (error) throw error;
  if (!data) throw new Error("提交批次失败");
  const row = Array.isArray(data) ? (data[0] as BatchRow) : (data as unknown as BatchRow);
  return toBatch(row);
}

export async function listRecentImports(limit = 6): Promise<ImportBatch[]> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("import_batches")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => toBatch(row as BatchRow));
}
