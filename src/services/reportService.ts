import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserId } from "@/services/authService";
import type { SharedReportRecord, SharedReportSnapshot } from "@/types/app/analytics";

function toRecord(row: Record<string, unknown>): SharedReportRecord {
  return {
    id: String(row.id),
    title: String(row.title),
    slug: String(row.slug),
    expires_at: String(row.expires_at),
    revoked_at: (row.revoked_at ?? null) as string | null,
    created_at: String(row.created_at),
  };
}

export async function listSharedReports(): Promise<SharedReportRecord[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const { data, error } = await supabase
    .from("shared_reports")
    .select("id, title, slug, expires_at, revoked_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(toRecord);
}

export async function createSharedReport(input: { title?: string; valid_days?: number }): Promise<SharedReportRecord> {
  const { data, error } = await supabase.functions.invoke<{ report: Record<string, unknown> }>(
    "create-shared-report",
    { body: { action: "create", ...input } },
  );
  if (error) throw error;
  if (!data?.report) throw new Error("empty_report");
  return toRecord(data.report);
}

export async function revokeSharedReport(id: string): Promise<void> {
  const { error } = await supabase.functions.invoke("create-shared-report", {
    body: { action: "revoke", id },
  });
  if (error) throw error;
}

export async function fetchPublicReport(slug: string): Promise<{
  title: string;
  snapshot: SharedReportSnapshot;
  expires_at: string;
  created_at: string;
}> {
  const { data, error } = await supabase.functions.invoke<{
    title: string;
    snapshot: SharedReportSnapshot;
    expires_at: string;
    created_at: string;
  }>("read-shared-report", { body: { slug } });
  if (error) throw error;
  if (!data) throw new Error("not_found");
  return data;
}
