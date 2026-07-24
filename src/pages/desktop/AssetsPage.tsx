import AssetFilters from "@/components/desktop/AssetFilters";
import BatchEditDialog, { type BatchField } from "@/components/desktop/BatchEditDialog";
import BatchToolbar from "@/components/desktop/BatchToolbar";
import DiagnosticHeader from "@/components/desktop/DiagnosticHeader";
import PlatformCell from "@/components/desktop/PlatformCell";
import QuoteChangeBadge from "@/components/desktop/QuoteChangeBadge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAssetPage,
  useAssetsByPlatform,
  useAssetSummary,
  useBatchDeleteAssets,
  useBatchUpdateAssets,
  useDeleteAsset,
  useMatchingAssetSummary,
  useQuotableAssets,
  useUpdateAsset,
} from "@/hooks/useAssetLedger";
import { useAssetQuoteChanges, usePortfolioQuoteChange, toQuoteRequests } from "@/hooks/useQuotes";
import { formatByCurrency, formatCompact, formatCurrency, formatNumber } from "@/lib/asset-format";
import { CURRENCY_META, CURRENCY_ORDER, convertAmount, formatAmountForInput, parseAmountInput, toBaseAmount } from "@/lib/currency";
import type { AssetBatchPatch, AssetListFilters } from "@/types/app/asset";
import { CATEGORY_LABEL, CATEGORY_ORDER, type Asset, type AssetCategory, type AssetInput } from "@/types/app/asset";
import { classifyQuoteInstrument } from "@/types/app/quote";
import { Pencil, PlusCircle, Trash2, Landmark } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import ccbLogo from "@/assets/bank-logos/ccb.svg";
import cebLogo from "@/assets/bank-logos/ceb.svg";
import cibLogo from "@/assets/bank-logos/cib.svg";
import citicLogo from "@/assets/bank-logos/citic.svg";
import cmbLogo from "@/assets/bank-logos/cmb.svg";
import hsbcLogo from "@/assets/bank-logos/hsbc.svg";
import scbLogo from "@/assets/bank-logos/scb.svg";
import spbLogo from "@/assets/bank-logos/spb.svg";

function getPlatformIcon(platform: string | undefined) {
  if (!platform) return <Landmark className="size-4 shrink-0 text-muted-foreground/50" />;
  
  const name = platform.toLowerCase();
  if (name.includes("招商银行")) return <img src={cmbLogo} alt="招商银行" className="size-4 shrink-0" />;
  if (name.includes("建设银行")) return <img src={ccbLogo} alt="建设银行" className="size-4 shrink-0" />;
  if (name.includes("中信银行")) return <img src={citicLogo} alt="中信银行" className="size-4 shrink-0" />;
  if (name.includes("光大银行")) return <img src={cebLogo} alt="光大银行" className="size-4 shrink-0" />;
  if (name.includes("兴业银行")) return <img src={cibLogo} alt="兴业银行" className="size-4 shrink-0" />;
  if (name.includes("汇丰银行")) return <img src={hsbcLogo} alt="汇丰银行" className="size-4 shrink-0" />;
  if (name.includes("渣打银行")) return <img src={scbLogo} alt="渣打银行" className="size-4 shrink-0" />;
  if (name.includes("浦发银行")) return <img src={spbLogo} alt="浦发银行" className="size-4 shrink-0" />;
  
  return <Landmark className="size-4 shrink-0 text-muted-foreground/50" />;
}

import abcLogo from "@/assets/bank-logos/abc.svg";
import alipayLogo from "@/assets/bank-logos/alipay.svg";
import bocLogo from "@/assets/bank-logos/boc.svg";
import bocomLogo from "@/assets/bank-logos/bocom.svg";
import ccbLogo from "@/assets/bank-logos/ccb.svg";
import cebLogo from "@/assets/bank-logos/ceb.svg";
import cibLogo from "@/assets/bank-logos/cib.svg";
import citicLogo from "@/assets/bank-logos/citic.svg";
import cmbLogo from "@/assets/bank-logos/cmb.svg";
import hsbcLogo from "@/assets/bank-logos/hsbc.svg";
import icbcLogo from "@/assets/bank-logos/icbc.svg";
import pinganLogo from "@/assets/bank-logos/pingan.svg";
import scbLogo from "@/assets/bank-logos/scb.svg";
import spbLogo from "@/assets/bank-logos/spb.svg";
import wechatLogo from "@/assets/bank-logos/wechat.svg";

// 天天基金暂用官方 App 图标 CDN URL（用户上传，Superun CDN 长期稳定）；后续如有 SVG 版本可换成本地文件。
const TTJJ_LOGO = "https://b.ux-cdn.com/uxarts/20260724/1946e4923f654e58ba3d4fe374930d4d.png";

function getPlatformIcon(platform: string | undefined) {
  if (!platform) return <Landmark className="size-4 shrink-0 text-muted-foreground/50" />;
  
  const name = platform.toLowerCase();
  if (name.includes("招商银行")) return <img src={cmbLogo} alt="招商银行" className="size-4 shrink-0" />;
  if (name.includes("建设银行")) return <img src={ccbLogo} alt="建设银行" className="size-4 shrink-0" />;
  if (name.includes("中信银行")) return <img src={citicLogo} alt="中信银行" className="size-4 shrink-0" />;
  if (name.includes("同花顺")) return <img src={cebLogo} alt="同花顺" className="size-4 shrink-0" />;
  if (name.includes("兴业银行")) return <img src={cibLogo} alt="兴业银行" className="size-4 shrink-0" />;
  if (name.includes("汇丰银行")) return <img src={hsbcLogo} alt="汇丰银行" className="size-4 shrink-0" />;
  if (name.includes("渣打银行")) return <img src={scbLogo} alt="渣打银行" className="size-4 shrink-0" />;
  if (name.includes("浦发") || name.includes("浦东发展")) return <img src={spbLogo} alt="浦发银行" className="size-4 shrink-0" />;
  if (name.includes("工商银行") || name.includes("工行")) return <img src={icbcLogo} alt="中国工商银行" className="size-4 shrink-0" />;
  if (name.includes("中国银行") || name.includes("中行")) return <img src={bocLogo} alt="中国银行" className="size-4 shrink-0" />;
  if (name.includes("农业银行") || name.includes("农行")) return <img src={abcLogo} alt="农业银行" className="size-4 shrink-0" />;
  if (name.includes("交通银行") || name.includes("交行")) return <img src={bocomLogo} alt="交通银行" className="size-4 shrink-0" />;
  if (name.includes("平安")) return <img src={pinganLogo} alt="平安" className="size-4 shrink-0" />;
  if (name.includes("汇丰")) return <img src={hsbcLogo} alt="汇丰银行" className="size-4 shrink-0" />;
  if (name.includes("渣打")) return <img src={scbLogo} alt="渣打银行" className="size-4 shrink-0" />;
  if (name.includes("天天基金")) return <img src={TTJJ_LOGO} alt="天天基金" className="size-4 shrink-0 rounded-sm" />;
  if (name.includes("蚂蚁") || name.includes("支付宝")) return <img src={alipayLogo} alt="支付宝" className="size-4 shrink-0" />;
  if (name.includes("微信")) return <img src={wechatLogo} alt="微信" className="size-4 shrink-0" />;
  
  return <Landmark className="size-4 shrink-0 text-muted-foreground/50" />;
}

const PAGE_SIZE = 20;
const EMPTY_FILTERS: AssetListFilters = { search: "", category: null, platform: null, source: null, currency: null };

export default function AssetsPage() {
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<AssetListFilters>(EMPTY_FILTERS);
  // 选择 Map 记录每条被选中资产的原始金额+币种，方便算合计。
  const [selected, setSelected] = useState<Map<string, { amount: number; currency: string }>>(() => new Map());

  const listQuery = useAssetPage(page, PAGE_SIZE, filters);
  const summaryQuery = useAssetSummary();
  const platformSummaryQuery = useAssetsByPlatform();
  const updateMutation = useUpdateAsset();
  const deleteMutation = useDeleteAsset();
  const batchDeleteMutation = useBatchDeleteAssets();
  const batchUpdateMutation = useBatchUpdateAssets();
  const matchingSummaryMutation = useMatchingAssetSummary();

  const [editing, setEditing] = useState<Asset | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Asset | null>(null);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [batchEditField, setBatchEditField] = useState<BatchField | null>(null);

  const totalMatching = listQuery.data?.total ?? 0;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalMatching / PAGE_SIZE)), [totalMatching]);
  const rows = listQuery.data?.rows ?? [];
  const platformNames = useMemo(() => (platformSummaryQuery.data ?? []).map((p) => p.platform), [platformSummaryQuery.data]);

  // 当前页里「有行情」的资产 → 逐条取涨跌，用于表格内展示。
  const pageQuoteRequests = useMemo(() => toQuoteRequests(rows), [rows]);
  const pageQuotes = useAssetQuoteChanges(pageQuoteRequests);
  // 全量「有行情」资产 → 组合级涨跌汇总，展示在总资产卡片上（不受分页影响）。
  const quotableAssets = useQuotableAssets();
  const portfolioQuoteRequests = useMemo(() => toQuoteRequests(quotableAssets.data ?? []), [quotableAssets.data]);
  const portfolioChange = usePortfolioQuoteChange(portfolioQuoteRequests);

  const selectedIds = useMemo(() => Array.from(selected.keys()), [selected]);
  const selectedCount = selected.size;
  const selectedSumInCny = useMemo(() => {
    let sum = 0;
    for (const item of selected.values()) sum += toBaseAmount(item.amount, item.currency);
    return sum;
  }, [selected]);

  const pageAllSelected = rows.length > 0 && rows.every((asset) => selected.has(asset.id));
  const pageSomeSelected = rows.some((asset) => selected.has(asset.id));
  const allMatchingSelected = selectedCount >= totalMatching && totalMatching > 0;

  useEffect(() => {
    setPage(0);
    setSelected(new Map());
  }, [filters.search, filters.category, filters.platform, filters.source, filters.currency]);

  const toggleOne = (asset: Asset, checked: boolean) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (checked) next.set(asset.id, { amount: asset.amount, currency: asset.currency });
      else next.delete(asset.id);
      return next;
    });
  };

  const toggleAllOnPage = (checked: boolean) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (checked) {
        for (const asset of rows) next.set(asset.id, { amount: asset.amount, currency: asset.currency });
      } else {
        for (const asset of rows) next.delete(asset.id);
      }
      return next;
    });
  };

  const clearSelection = () => setSelected(new Map());

  const handleSelectAllMatching = async () => {
    try {
      const list = await matchingSummaryMutation.mutateAsync(filters);
      const next = new Map<string, { amount: number; currency: string }>();
      for (const item of list) next.set(item.id, { amount: item.amount, currency: item.currency });
      setSelected(next);
      if (list.length >= 1000) toast.warning("为保护系统性能，最多选中 1000 项");
    } catch (error) {
      toast.error(`选中匹配项失败：${(error as Error).message}`);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedCount === 0) return;
    try {
      const count = await batchDeleteMutation.mutateAsync(selectedIds);
      toast.success(`已删除 ${count} 项资产`);
      clearSelection();
      setBatchDeleteOpen(false);
      setPage(0);
    } catch (error) {
      toast.error(`批量删除失败：${(error as Error).message}`);
    }
  };

  const handleBatchEdit = async (patch: AssetBatchPatch) => {
    if (selectedCount === 0) return;
    try {
      const count = await batchUpdateMutation.mutateAsync({ ids: selectedIds, patch });
      const label = patch.platform !== undefined ? "平台" : patch.category !== undefined ? "类别" : "币种";
      toast.success(`已修改 ${count} 项资产的${label}`);
      clearSelection();
      setBatchEditField(null);
      setPage(0);
    } catch (error) {
      toast.error(`批量修改失败：${(error as Error).message}`);
    }
  };

  const totalConverted = summaryQuery.data?.converted ?? false;
  const totalMixed = summaryQuery.data?.mixed ?? false;
  const currencyLabels = summaryQuery.data?.currencies ?? [];

  // 单条编辑成功：如果该资产在选择中，同步刷新 Map，避免后续批量删除确认框里的合计跨岁
  const syncSelectionOnUpdate = (updated: Asset) => {
    setSelected((prev) => {
      if (!prev.has(updated.id)) return prev;
      const next = new Map(prev);
      next.set(updated.id, { amount: updated.amount, currency: updated.currency });
      return next;
    });
  };

  const syncSelectionOnDelete = (deletedId: string) => {
    setSelected((prev) => {
      if (!prev.has(deletedId)) return prev;
      const next = new Map(prev);
      next.delete(deletedId);
      return next;
    });
  };

  return <div className="space-y-6">
    <DiagnosticHeader title="资产账本" eyebrow="ASSET LEDGER" description="所有资产都在这里，随时增删改；后续所有诊断都会用这份数据。" />

    <section className="grid gap-4 md:grid-cols-2">
      <SummaryCard
        label="总资产"
        value={summaryQuery.data ? formatCurrency(summaryQuery.data.total) : "—"}
        note={summaryQuery.data
          ? `${summaryQuery.data.count} 项资产已入账${totalConverted ? ` · ${totalMixed ? `含 ${currencyLabels.length} 种币种，` : "含外币资产，"}已按参考汇率折算为人民币` : ""}`
          : "载入中"}
        loading={summaryQuery.isLoading}
        change={portfolioChange.data.covered > 0 ? (
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span className="text-xs text-muted-foreground">今日涨跌</span>
            <QuoteChangeBadge
              variant="block"
              detailed={false}
              currency="CNY"
              loading={portfolioChange.isLoading}
              change={{
                code: "portfolio",
                changeAmount: portfolioChange.data.changeAmount,
                changePct: portfolioChange.data.changePct,
                        {getPlatformIcon(asset.platform)}
                        <span>{asset.platform || "—"}</span>
                asOf: new Date().toISOString(),
              }}
            />
          </div>
        ) : null}
      />
      <div className="flex items-center justify-between rounded-lg border border-primary/25 bg-primary/5 p-5">
        <div><b>继续增加资产</b><p className="mt-1 text-xs text-muted-foreground">还有账户没归集？回到导入页继续。</p></div>
        <Button asChild variant="secondary" className="gap-2"><Link to="/import"><PlusCircle className="size-4" />去添加</Link></Button>
      </div>
    </section>

    <section className="rounded-lg border border-border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
        <b>资产明细</b>
        <span className="text-xs text-muted-foreground">共 {formatNumber(totalMatching)} 项 · 按平台归类</span>
      </header>

      <AssetFilters filters={filters} platforms={platformNames} onChange={setFilters} />

      <BatchToolbar
        selectedCount={selectedCount}
        selectedSum={selectedSumInCny}
        totalMatching={totalMatching}
        allMatchingSelected={allMatchingSelected}
        onSelectAllMatching={handleSelectAllMatching}
        onDelete={() => setBatchDeleteOpen(true)}
        onEditPlatform={() => setBatchEditField("platform")}
        onEditCategory={() => setBatchEditField("category")}
        onEditCurrency={() => setBatchEditField("currency")}
        onClearSelection={clearSelection}
        deleting={batchDeleteMutation.isPending}
        editing={batchUpdateMutation.isPending}
      />

      {listQuery.isLoading ? <div className="space-y-3 p-5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div> :
        rows.length === 0 ? <EmptyState hasFilters={filtersActive(filters)} /> :
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr className="text-left">
                  <th className="w-10 px-4 py-3">
                    <Checkbox
                      aria-label="选择当前页全部"
                      checked={pageAllSelected ? true : pageSomeSelected ? "indeterminate" : false}
                      onCheckedChange={(checked) => toggleAllOnPage(checked === true)}
                    />
                  </th>
                  <th className="px-4 py-3">名称</th><th className="px-4 py-3">类别</th><th className="px-4 py-3">平台</th><th className="px-4 py-3">代码</th><th className="px-4 py-3 text-right">金额</th><th className="px-4 py-3 text-right">今日涨跌</th><th className="w-24 px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((asset, index) => {
                  const isSelected = selected.has(asset.id);
                  const prevAsset = index > 0 ? rows[index - 1] : null;
                  const platformChanged = prevAsset ? prevAsset.platform !== asset.platform : false;
                  const meta = CURRENCY_META[asset.currency];
                  const isNonCny = asset.currency !== "CNY";
                  // 用代码 + 类别的综合算法判断该资产是否有行情（基金/股票），决定是否展示涨跌。
                  const quotable = classifyQuoteInstrument(asset.code, asset.category) !== null;
                  const quote = pageQuotes.data?.[asset.id];
                  return <tr key={asset.id} className={`${isSelected ? "bg-primary/5" : "hover:bg-muted/30"} ${platformChanged ? "border-t-2 border-t-border/60" : ""}`}>
                    <td className="px-4 py-3">
                      <Checkbox
                        aria-label={`选择 ${asset.name}`}
                        checked={isSelected}
                        onCheckedChange={(checked) => toggleOne(asset, checked === true)}
                      />
                    </td>
                    <td className="px-4 py-3"><div><b className="text-foreground">{asset.name}</b>{asset.note && <p className="mt-0.5 text-xs text-muted-foreground">{asset.note}</p>}</div></td>
                    <td className="px-4 py-3 text-muted-foreground">{CATEGORY_LABEL[asset.category]}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div className="flex items-center gap-2">
                        {asset.platform ? <PlatformCell platform={asset.platform} /> : "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{asset.code ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      {formatByCurrency(asset.amount, asset.currency, true)}
                      {isNonCny && <span className="ml-1 text-[10px] font-sans tracking-wider text-muted-foreground">{meta?.code ?? asset.currency}</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {quotable
                        ? (quote || pageQuotes.isLoading
                            ? <QuoteChangeBadge change={quote} loading={pageQuotes.isLoading} />
                            : <span className="text-xs text-muted-foreground/50">—</span>)
                        : <span className="text-xs text-muted-foreground/50">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={() => setEditing(asset)}><Pencil className="size-4" /></Button><Button variant="ghost" size="icon" onClick={() => setPendingDelete(asset)}><Trash2 className="size-4 text-destructive/70" /></Button></div></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
      }

      <footer className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted-foreground">
        <span>共 {totalMatching} 项 · 总额 {summaryQuery.data ? formatCompact(summaryQuery.data.total) : "—"}{totalConverted ? "（折算）" : ""}</span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" disabled={page === 0 || listQuery.isFetching} onClick={() => setPage((prev) => Math.max(0, prev - 1))}>上一页</Button>
          <Button variant="ghost" size="sm" disabled={page + 1 >= totalPages || listQuery.isFetching} onClick={() => setPage((prev) => prev + 1)}>下一页</Button>
        </div>
      </footer>
    </section>

    <EditAssetDialog asset={editing} onClose={() => setEditing(null)} onSave={async (id, patch) => {
      const updated = await updateMutation.mutateAsync({ id, patch });
      syncSelectionOnUpdate(updated);
      toast.success("资产已更新");
      setEditing(null);
    }} saving={updateMutation.isPending} />

    <AlertDialog open={pendingDelete != null} onOpenChange={(open) => !open && setPendingDelete(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>删除这项资产？</AlertDialogTitle>
          <AlertDialogDescription>「{pendingDelete?.name}」将从你的账本中移除，之后的诊断报告不再包含它。此操作无法撤销。</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>取消</AlertDialogCancel>
          <AlertDialogAction disabled={deleteMutation.isPending} onClick={async () => {
            if (!pendingDelete) return;
            const removedId = pendingDelete.id;
            await deleteMutation.mutateAsync(removedId);
            syncSelectionOnDelete(removedId);
            toast.success("已删除");
            setPendingDelete(null);
          }}>删除</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={batchDeleteOpen} onOpenChange={(open) => !open && !batchDeleteMutation.isPending && setBatchDeleteOpen(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>删除已选的 {selectedCount} 项资产？</AlertDialogTitle>
          <AlertDialogDescription>
            合计约 <b className="text-foreground font-mono">{formatCurrency(selectedSumInCny, true)}</b>（跨币种按参考汇率折算），将从你的账本中移除。此操作无法撤销，之后的诊断报告将不再包含这些资产。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={batchDeleteMutation.isPending}>取消</AlertDialogCancel>
          <AlertDialogAction disabled={batchDeleteMutation.isPending} onClick={handleBatchDelete}>
            {batchDeleteMutation.isPending ? "删除中…" : `删除 ${selectedCount} 项`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <BatchEditDialog
      open={batchEditField != null}
      field={batchEditField ?? "platform"}
      count={selectedCount}
      saving={batchUpdateMutation.isPending}
      suggestedPlatforms={platformNames}
      onClose={() => setBatchEditField(null)}
      onConfirm={handleBatchEdit}
    />
  </div>;
}

function filtersActive(filters: AssetListFilters): boolean {
  return (filters.search?.trim().length ?? 0) > 0 || filters.category != null || filters.platform != null || filters.source != null || filters.currency != null;
}

function SummaryCard({ label, value, note, loading, change }: { label: string; value: string; note?: string; loading?: boolean; change?: React.ReactNode }) {
  return <section className="rounded-lg border border-border bg-card p-5"><div className="text-sm text-muted-foreground">{label}</div>{loading ? <Skeleton className="mt-3 h-8 w-32" /> : <strong className="mt-3 block font-mono text-2xl tracking-tight">{value}</strong>}{change}{note && <p className="mt-3 text-xs text-muted-foreground">{note}</p>}</section>;
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  if (hasFilters) {
    return <div className="py-16 text-center text-sm text-muted-foreground">
      <p>没有符合筛选条件的资产。</p>
      <p className="mt-2 text-xs">试试放宽筛选条件，或去<Link to="/import" className="text-primary underline underline-offset-2">导入页</Link>添加更多资产。</p>
    </div>;
  }
  return <div className="py-16 text-center text-sm text-muted-foreground">
    <p>账本还是空的。</p>
    <Button asChild className="mt-4 gap-2"><Link to="/import"><PlusCircle className="size-4" />去添加第一笔资产</Link></Button>
  </div>;
}

interface EditAssetDialogProps { asset: Asset | null; onClose: () => void; onSave: (id: string, patch: Partial<AssetInput>) => Promise<void>; saving: boolean }

interface EditFormState {
  name: string;
  category: AssetCategory;
  platform: string;
  amount: string;
  amountPrecise?: number;
  currency: string;
  code: string;
  note: string;
}

function EditAssetDialog({ asset, onClose, onSave, saving }: EditAssetDialogProps) {
  const [form, setForm] = useState<EditFormState>({ name: "", category: "fund", platform: "", amount: "", amountPrecise: undefined, currency: "CNY", code: "", note: "" });
  const [conversionHint, setConversionHint] = useState<string | null>(null);
  const open = asset != null;

  useEffect(() => {
    if (!asset) return;
    // 初始化时：amount 字符串用 2 位小数展示；amountPrecise 保留 DB 里原始精度，若用户不改金额仅切币，直接拿它去换算。
    setForm({
      name: asset.name,
      category: asset.category,
      platform: asset.platform,
      amount: formatAmountForInput(asset.amount),
      amountPrecise: asset.amount,
      currency: asset.currency,
      code: asset.code ?? "",
      note: asset.note ?? "",
    });
    setConversionHint(null);
  }, [asset]);

  const handleCurrencyChange = (next: string) => {
    setForm((prev) => {
      if (next === prev.currency) return prev;
      const numeric = prev.amountPrecise ?? parseAmountInput(prev.amount);
      if (numeric === null || numeric <= 0) {
        setConversionHint(null);
        return { ...prev, currency: next, amountPrecise: undefined };
      }
      // 不传 rates → convertAmount 自动回落到与总资产聚合同一套参考汇率，保证 CNY 总额前后一致。
      const converted = convertAmount(numeric, prev.currency, next);
      const fromMeta = CURRENCY_META[prev.currency];
      const toMeta = CURRENCY_META[next];
      setConversionHint(
        `已按参考汇率折算（人民币等值不变）：${fromMeta?.symbol ?? ""}${formatAmountForInput(numeric)} ${prev.currency} → ${toMeta?.symbol ?? ""}${formatAmountForInput(converted)} ${next}`,
      );
      return { ...prev, currency: next, amount: formatAmountForInput(converted), amountPrecise: converted };
    });
  };

  const handleAmountChange = (value: string) => {
    setForm((prev) => ({ ...prev, amount: value, amountPrecise: undefined }));
    if (conversionHint) setConversionHint(null);
  };

  const symbol = CURRENCY_META[form.currency]?.symbol ?? "";

  return <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
    <DialogContent>
      <DialogHeader><DialogTitle>编辑资产</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2"><Label>名称</Label><Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} /></div>
          <div className="space-y-2"><Label>平台</Label><Input value={form.platform} onChange={(event) => setForm((prev) => ({ ...prev, platform: event.target.value }))} /></div>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-2"><Label>类别</Label>
            <Select value={form.category} onValueChange={(value) => setForm((prev) => ({ ...prev, category: value as AssetCategory }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORY_ORDER.map((category) => <SelectItem key={category} value={category}>{CATEGORY_LABEL[category]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>币种</Label>
            <Select value={form.currency} onValueChange={handleCurrencyChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CURRENCY_ORDER.map((code) => <SelectItem key={code} value={code}>{CURRENCY_META[code].symbol} {code}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>金额{symbol && `（${symbol}）`}</Label>
            <Input value={form.amount} onChange={(event) => handleAmountChange(event.target.value)} />
          </div>
          <div className="space-y-2"><Label>代码</Label><Input value={form.code} onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))} /></div>
        </div>
        {conversionHint && <p className="-mt-2 text-[11px] text-muted-foreground leading-relaxed">{conversionHint}</p>}
        <div className="space-y-2"><Label>备注</Label><Input value={form.note} onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))} /></div>
      </div>
      <DialogFooter className="mt-4">
        <Button variant="ghost" onClick={onClose} disabled={saving}>取消</Button>
        <Button onClick={async () => {
          if (!asset) return;
          // 优先拿换算后的全精度值，用户手改后回落到字符串解析。
          const amount = form.amountPrecise ?? parseAmountInput(form.amount);
          if (amount === null || amount < 0) { toast.error("请输入正确的金额"); return; }
          await onSave(asset.id, {
            name: form.name,
            platform: form.platform,
            category: form.category,
            amount,
            currency: form.currency,
            code: form.code || null,
            note: form.note || null,
          });
        }} disabled={saving}>保存</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
