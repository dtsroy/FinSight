import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CURRENCY_META, CURRENCY_ORDER, convertAmount, formatAmountForInput, rateToCny } from "@/lib/currency";
import { CATEGORY_LABEL, CATEGORY_ORDER, type AssetCategory, type ParsedAssetRow } from "@/types/app/asset";
import { AlertTriangle, CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export interface ParsedRowState extends ParsedAssetRow { include: boolean }

interface ParsedAssetsReviewProps {
  rows?: ParsedAssetRow[];
  source: "csv" | "ocr";
  fileUrl?: string | null;
  fileKey?: string | null;
  onCommit?: (rows: ParsedAssetRow[], meta: { fileUrl?: string | null; fileKey?: string | null; note?: string | null }) => Promise<void> | void;
  onDiscard?: () => void;
  committing?: boolean;
}

const cloneRow = (row: ParsedAssetRow): ParsedRowState => ({
  ...row,
  currency: (row.currency || "CNY").toUpperCase(),
  include: row.errors.length === 0,
});

export default function ParsedAssetsReview({ rows = [], source, fileUrl, fileKey, onCommit, onDiscard, committing = false }: ParsedAssetsReviewProps) {
  const [items, setItems] = useState<ParsedRowState[]>(() => rows.map(cloneRow));
  useEffect(() => { setItems(rows.map(cloneRow)); }, [rows]);

  const updateRow = (index: number, patch: Partial<ParsedRowState>) => {
    setItems((prev) => prev.map((row, idx) => (idx === index ? validateRow({ ...row, ...patch }) : row)));
  };

  const changeCurrency = (index: number, nextCode: string) => {
    setItems((prev) => prev.map((row, idx) => {
      if (idx !== index) return row;
      const current = (row.currency || "CNY").toUpperCase();
      if (current === nextCode) return row;
      if (!Number.isFinite(row.amount) || row.amount <= 0) {
        return validateRow({ ...row, currency: nextCode });
      }
      // 走内置参考汇率（不传 rates），与总资产聚合保持同一套基准，入账后 CNY 总额不变。
      const converted = convertAmount(row.amount, current, nextCode);
      return validateRow({ ...row, currency: nextCode, amount: converted });
    }));
  };

  const removeRow = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const stats = useMemo(() => {
    const included = items.filter((row) => row.include && row.errors.length === 0).length;
    const withErrors = items.filter((row) => row.errors.length > 0).length;
    return { included, withErrors, total: items.length };
  }, [items]);

  // 展示一句"参考汇率概览"给用户对折算规则有直观感受
  const rateHint = useMemo(() => {
    const usd = rateToCny("USD");
    const hkd = rateToCny("HKD");
    return `内置参考汇率：1 USD ≈ ${usd.toFixed(2)} CNY · 1 HKD ≈ ${hkd.toFixed(2)} CNY · 切换币种时仅换表达单位，人民币等值不变`;
  }, []);

  const handleConfirm = async () => {
    const toCommit = items.filter((row) => row.include);
    if (toCommit.length === 0 && stats.withErrors === 0) {
      toast.error("请至少勾选一条要入账的资产");
      return;
    }
    await onCommit?.(toCommit.map(({ include: _include, ...rest }) => rest), { fileUrl, fileKey, note: `${source === "csv" ? "CSV 上传" : "截图 OCR"}：识别 ${stats.total} 条，入账 ${toCommit.length} 条` });
    toast.success(`已入账 ${toCommit.length} 项资产`);
  };

  if (items.length === 0) {
    return <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">尚未识别到资产，请重新上传或换一张更清晰的截图。</div>;
  }

  return <section className="space-y-4 rounded-lg border border-border bg-card p-5">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><b className="text-base">识别结果 · {stats.total} 条</b>
        <p className="mt-1 text-xs text-muted-foreground">勾选要入账的行，可就地修正名称、类别、平台、币种与金额；红色标记的行请补齐后再勾选。</p>
      </div>
      <div className="flex items-center gap-3 text-xs">
        <span className="flex items-center gap-1 text-success"><CheckCircle2 className="size-3.5" />已勾选 {stats.included}</span>
        {stats.withErrors > 0 && <span className="flex items-center gap-1 text-destructive"><AlertTriangle className="size-3.5" />待修正 {stats.withErrors}</span>}
      </div>
    </header>

    <p className="rounded-md border border-dashed border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">{rateHint}</p>

    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/60 text-xs text-muted-foreground">
          <tr className="text-left">
            <th className="w-10 px-3 py-2"></th><th className="px-3 py-2">名称</th><th className="px-3 py-2">类别</th><th className="px-3 py-2">平台</th><th className="px-3 py-2 w-24">币种</th><th className="px-3 py-2 text-right">金额</th><th className="px-3 py-2">代码</th><th className="w-10 px-3 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((row, index) => {
            const hasErrors = row.errors.length > 0;
            const currencyCode = (row.currency || "CNY").toUpperCase();
            const meta = CURRENCY_META[currencyCode];
            return <tr key={index} className={hasErrors ? "bg-destructive/5" : ""}>
              <td className="px-3 py-2 align-top"><Checkbox checked={row.include} disabled={hasErrors} onCheckedChange={(checked) => updateRow(index, { include: !!checked })} /></td>
              <td className="px-3 py-2 align-top"><Input value={row.name} onChange={(event) => updateRow(index, { name: event.target.value })} className="h-8" /></td>
              <td className="px-3 py-2 align-top">
                <Select value={row.category} onValueChange={(value) => updateRow(index, { category: value as AssetCategory })}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORY_ORDER.map((category) => <SelectItem key={category} value={category}>{CATEGORY_LABEL[category]}</SelectItem>)}</SelectContent>
                </Select>
              </td>
              <td className="px-3 py-2 align-top"><Input value={row.platform} onChange={(event) => updateRow(index, { platform: event.target.value })} className="h-8" /></td>
              <td className="px-3 py-2 align-top">
                <Select value={currencyCode} onValueChange={(value) => changeCurrency(index, value)}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCY_ORDER.map((code) => <SelectItem key={code} value={code}>{CURRENCY_META[code].symbol} {code}</SelectItem>)}</SelectContent>
                </Select>
              </td>
              <td className="px-3 py-2 align-top">
                <div className="flex items-center gap-1">
                  <span className="w-6 text-right text-xs text-muted-foreground">{meta?.symbol ?? ""}</span>
                  <Input value={row.amount === 0 && hasErrors ? "" : formatAmountForInput(row.amount)} onChange={(event) => {
                    const value = event.target.value.replace(/[,\s¥$€£₩]/g, "");
                    const num = Number(value);
                    updateRow(index, { amount: Number.isFinite(num) ? num : 0 });
                  }} className="h-8 text-right" />
                </div>
              </td>
              <td className="px-3 py-2 align-top"><Input value={row.code ?? ""} onChange={(event) => updateRow(index, { code: event.target.value || null })} className="h-8" /></td>
              <td className="px-3 py-2 align-top"><Button variant="ghost" size="icon" onClick={() => removeRow(index)} type="button"><Trash2 className="size-4 text-muted-foreground" /></Button></td>
            </tr>;
          })}
        </tbody>
      </table>
    </div>

    {items.some((row) => row.errors.length > 0) && <ul className="space-y-1 text-xs text-destructive">
      {items.map((row, index) => row.errors.length > 0 ? <li key={`err-${index}`}>第 {index + 1} 行 · {row.errors.join("；")}</li> : null)}
    </ul>}

    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
      <p className="text-xs text-muted-foreground">共 {stats.total} 条 · 已勾选 {stats.included} 条待入账 {stats.withErrors > 0 ? ` · 剩余 ${stats.withErrors} 条需补齐后重新勾选` : ""}</p>
      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={onDiscard} disabled={committing}>放弃这次结果</Button>
        <Button type="button" onClick={handleConfirm} disabled={committing || stats.included === 0} className="gap-2">{committing ? <Loader2 className="size-4 animate-spin" /> : null}确认导入</Button>
      </div>
    </div>
  </section>;
}

function validateRow(row: ParsedRowState): ParsedRowState {
  const errors: string[] = [];
  if (!row.name.trim()) errors.push("缺少资产名称");
  if (!row.platform.trim()) errors.push("缺少所在平台");
  if (!row.category) errors.push("缺少资产类别");
  if (!Number.isFinite(row.amount) || row.amount <= 0) errors.push("金额需大于 0");
  return { ...row, errors, include: errors.length === 0 ? row.include : false };
}
