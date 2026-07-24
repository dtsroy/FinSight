import { supabase } from "@/integrations/supabase/client";
import { toBaseAmount, toValidCurrency } from "@/lib/currency";
import type {
  Asset,
  AssetBatchPatch,
  AssetInput,
  AssetListFilters,
  AssetPage,
  CategorySummary,
} from "@/types/app/asset";

interface AssetRow {
  id: string;
  name: string;
  category: Asset["category"];
  platform: string;
  amount: string | number;
  currency: string | null;
  code: string | null;
  purchase_date: string | null;
  note: string | null;
  source: Asset["source"];
  batch_id: string | null;
  created_at: string;
  updated_at: string;
}

const MAX_BATCH_IDS = 1000;

const toAsset = (row: AssetRow): Asset => ({
  id: row.id,
  name: row.name,
  category: row.category,
  platform: row.platform,
  amount: Number(row.amount),
  currency: (row.currency || "CNY").toUpperCase(),
  code: row.code,
  purchaseDate: row.purchase_date,
  note: row.note,
  source: row.source,
  batchId: row.batch_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user?.id;
  if (!userId) throw new Error("未登录");
  return userId;
}

const sanitizeSearch = (input?: string) => (input ?? "").replace(/[,()%*]/g, "").trim();

function applyFilters<Q extends { eq: (col: string, v: unknown) => Q; or: (query: string) => Q }>(
  query: Q,
  filters?: AssetListFilters,
): Q {
  if (!filters) return query;
  let q = query;
  if (filters.category) q = q.eq("category", filters.category);
  if (filters.platform) q = q.eq("platform", filters.platform);
  if (filters.source) q = q.eq("source", filters.source);
  if (filters.currency) q = q.eq("currency", toValidCurrency(filters.currency));
  const safe = sanitizeSearch(filters.search);
  if (safe) q = q.or(`name.ilike.%${safe}%,code.ilike.%${safe}%`);
  return q;
}

export async function listAssets(
  page: number,
  pageSize: number,
  filters?: AssetListFilters,
): Promise<AssetPage> {
  const userId = await requireUserId();
  const from = page * pageSize;
  const to = from + pageSize - 1;
  let query = supabase
    .from("assets")
    .select("*", { count: "exact" })
    .eq("user_id", userId);
  query = applyFilters(query, filters);
  // 同一平台的资产聚在一起显示；同平台内按加入时间倒排。
  const { data, error, count } = await query
    .order("platform", { ascending: true })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);
  if (error) throw error;
  return { rows: (data ?? []).map((row) => toAsset(row as AssetRow)), total: count ?? 0 };
}

export interface AssetIdAmount { id: string; amount: number; currency: string }

export async function listMatchingAssetSummary(filters?: AssetListFilters): Promise<AssetIdAmount[]> {
  const userId = await requireUserId();
  let query = supabase.from("assets").select("id, amount, currency").eq("user_id", userId);
  query = applyFilters(query, filters);
  const { data, error } = await query
    .order("platform", { ascending: true })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(MAX_BATCH_IDS);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id as string,
    amount: Number(row.amount ?? 0),
    currency: (row.currency as string | null) || "CNY",
  }));
}

export async function listAssetsByCategory(): Promise<CategorySummary[]> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("assets")
    .select("category, amount, currency")
    .eq("user_id", userId);
  if (error) throw error;
  const acc = new Map<Asset["category"], CategorySummary>();
  for (const row of data ?? []) {
    const category = row.category as Asset["category"];
    const amount = toBaseAmount(Number(row.amount ?? 0), row.currency as string | null);
    const current = acc.get(category);
    if (current) {
      current.amount += amount;
      current.count += 1;
    } else {
      acc.set(category, { category, amount, count: 1 });
    }
  }
  return Array.from(acc.values()).sort((a, b) => b.amount - a.amount);
}

export interface PlatformSummary { platform: string; amount: number; count: number }

export async function listAssetsByPlatform(): Promise<PlatformSummary[]> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("assets")
    .select("platform, amount, currency")
    .eq("user_id", userId);
  if (error) throw error;
  const acc = new Map<string, PlatformSummary>();
  for (const row of data ?? []) {
    const platform = (row.platform as string) || "未标注";
    const amount = toBaseAmount(Number(row.amount ?? 0), row.currency as string | null);
    const current = acc.get(platform);
    if (current) {
      current.amount += amount;
      current.count += 1;
    } else {
      acc.set(platform, { platform, amount, count: 1 });
    }
  }
  return Array.from(acc.values()).sort((a, b) => b.amount - a.amount);
}

export interface AssetSummary {
  total: number;
  count: number;
  currencies: string[];
  /** 币种集合大小 ≥ 2 时为 true。 */
  mixed: boolean;
  /** 存在任一非人民币资产时为 true —— 即使只有一种外币，总额也已经被折算。 */
  converted: boolean;
}

export async function summarizeAssets(): Promise<AssetSummary> {
  const userId = await requireUserId();
  const { data, error, count } = await supabase
    .from("assets")
    .select("amount, currency", { count: "exact" })
    .eq("user_id", userId);
  if (error) throw error;
  let total = 0;
  const currencies = new Set<string>();
  for (const row of data ?? []) {
    const currency = ((row.currency as string | null) || "CNY").toUpperCase();
    currencies.add(currency);
    total += toBaseAmount(Number(row.amount ?? 0), currency);
  }
  const list = Array.from(currencies);
  return {
    total,
    count: count ?? 0,
    currencies: list,
    mixed: list.length > 1,
    converted: list.some((c) => c !== "CNY"),
  };
}

export async function createAsset(input: AssetInput): Promise<Asset> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("assets")
    .insert({
      user_id: userId,
      name: input.name.trim(),
      category: input.category,
      platform: input.platform.trim(),
      amount: input.amount,
      currency: toValidCurrency(input.currency),
      code: input.code?.trim() || null,
      purchase_date: input.purchaseDate ?? null,
      note: input.note?.trim() || null,
      source: input.source ?? "manual",
      batch_id: input.batchId ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return toAsset(data as AssetRow);
}

export async function createAssets(rows: AssetInput[]): Promise<number> {
  if (rows.length === 0) return 0;
  const userId = await requireUserId();
  const payload = rows.map((row) => ({
    user_id: userId,
    name: row.name.trim(),
    category: row.category,
    platform: row.platform.trim(),
    amount: row.amount,
    currency: toValidCurrency(row.currency),
    code: row.code?.trim() || null,
    purchase_date: row.purchaseDate ?? null,
    note: row.note?.trim() || null,
    source: row.source ?? "manual",
    batch_id: row.batchId ?? null,
  }));
  const { error, count } = await supabase.from("assets").insert(payload, { count: "exact" });
  if (error) throw error;
  return count ?? payload.length;
}

export async function updateAsset(id: string, input: Partial<AssetInput>): Promise<Asset> {
  const userId = await requireUserId();
  const patch: Record<string, unknown> = {};
  if (input.name != null) patch.name = input.name.trim();
  if (input.platform != null) patch.platform = input.platform.trim();
  if (input.category != null) patch.category = input.category;
  if (input.amount != null) patch.amount = input.amount;
  if (input.currency != null) patch.currency = toValidCurrency(input.currency);
  if (input.code !== undefined) patch.code = input.code?.trim() || null;
  if (input.purchaseDate !== undefined) patch.purchase_date = input.purchaseDate || null;
  if (input.note !== undefined) patch.note = input.note?.trim() || null;
  const { data, error } = await supabase
    .from("assets")
    .update(patch)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) throw error;
  return toAsset(data as AssetRow);
}

export async function deleteAsset(id: string): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase.from("assets").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

export async function batchDeleteAssets(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const userId = await requireUserId();
  const targets = ids.slice(0, MAX_BATCH_IDS);
  const { error, count } = await supabase
    .from("assets")
    .delete({ count: "exact" })
    .in("id", targets)
    .eq("user_id", userId);
  if (error) throw error;
  return count ?? targets.length;
}

export async function batchUpdateAssets(ids: string[], patch: AssetBatchPatch): Promise<number> {
  if (ids.length === 0) return 0;
  const userId = await requireUserId();
  const targets = ids.slice(0, MAX_BATCH_IDS);

  // 币种变更走 RPC per-row 换算（保证 CNY 总额不变）；其他字段另走 bulk update。
  if (patch.currency !== undefined) {
    const targetCurrency = toValidCurrency(patch.currency);
    const { data: convertedCount, error: rpcError } = await supabase.rpc("batch_change_currency", {
      target_ids: targets,
      target_currency: targetCurrency,
    });
    if (rpcError) throw rpcError;

    const other: Record<string, unknown> = {};
    if (patch.platform !== undefined) other.platform = patch.platform.trim();
    if (patch.category !== undefined) other.category = patch.category;
    if (Object.keys(other).length > 0) {
      const { error } = await supabase
        .from("assets")
        .update(other)
        .in("id", targets)
        .eq("user_id", userId);
      if (error) throw error;
    }
    // 返回受影响行数：已与目标币种相同的行不计数；若全部相同，本次操作没改任何东西。
    return Number(convertedCount ?? 0);
  }

  const payload: Record<string, unknown> = {};
  if (patch.platform !== undefined) payload.platform = patch.platform.trim();
  if (patch.category !== undefined) payload.category = patch.category;
  if (Object.keys(payload).length === 0) return 0;
  const { error, count } = await supabase
    .from("assets")
    .update(payload, { count: "exact" })
    .in("id", targets)
    .eq("user_id", userId);
  if (error) throw error;
  return count ?? targets.length;
}

export async function clearDemoAssets(): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase.from("assets").delete().eq("user_id", userId).eq("source", "demo");
  if (error) throw error;
  await supabase.from("import_batches").delete().eq("user_id", userId).eq("source", "demo");
}
