import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateAsset } from "@/hooks/useAssetLedger";
import { CURRENCY_META, CURRENCY_ORDER, convertAmount, formatAmountForInput, parseAmountInput } from "@/lib/currency";
import { CATEGORY_LABEL, CATEGORY_ORDER, type AssetCategory } from "@/types/app/asset";
import { Loader2, PlusCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// `amountPrecise` 是去 round 后的全精度浮点值：切币产生换算时写入，保证入账用的金额跟总资产聚合完全同基。
// 用户自己改 amount 输入框 → amountPrecise 清空，那时候以用户输入为准。
interface FormState {
  name: string;
  category: AssetCategory;
  platform: string;
  amount: string;
  amountPrecise?: number;
  currency: string;
  code: string;
  note: string;
}

const initialState: FormState = {
  name: "",
  category: "fund",
  platform: "",
  amount: "",
  amountPrecise: undefined,
  currency: "CNY",
  code: "",
  note: "",
};

export default function ManualAssetForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [conversionHint, setConversionHint] = useState<string | null>(null);
  const create = useCreateAsset();

  const handleCurrencyChange = (next: string) => {
    setForm((prev) => {
      if (next === prev.currency) return prev;
      const numeric = prev.amountPrecise ?? parseAmountInput(prev.amount);
      if (numeric === null || numeric <= 0) {
        setConversionHint(null);
        return { ...prev, currency: next, amountPrecise: undefined };
      }
      // 不传 rates → convertAmount 自动回落到 CURRENCY_META.baseRate，与总资产聚合走同一套汇率，确保换币后 CNY 等值恒定。
      const converted = convertAmount(numeric, prev.currency, next);
      const fromMeta = CURRENCY_META[prev.currency];
      const toMeta = CURRENCY_META[next];
      setConversionHint(
        `已按参考汇率折算（人民币等值不变）：${fromMeta?.symbol ?? ""}${formatAmountForInput(numeric)} ${prev.currency} → ${toMeta?.symbol ?? ""}${formatAmountForInput(converted)} ${next}`,
      );
      // amount 字段只用于展示（2 位小数）；amountPrecise 保存精确浮点供入库。
      return { ...prev, currency: next, amount: formatAmountForInput(converted), amountPrecise: converted };
    });
  };

  const handleAmountChange = (value: string) => {
    // 用户手改 → 放弃精确值，后面以用户输入为源头。
    setForm((prev) => ({ ...prev, amount: value, amountPrecise: undefined }));
    if (conversionHint) setConversionHint(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    // 优先使用换算产生的精确值，默认回落到用户手改后的字符串解析。
    const numeric = form.amountPrecise ?? parseAmountInput(form.amount);
    if (!form.name.trim() || !form.platform.trim() || numeric === null || numeric < 0) {
      toast.error("请填写完整的资产名称、平台与金额");
      return;
    }
    await create.mutateAsync({
      name: form.name,
      category: form.category,
      platform: form.platform,
      amount: numeric,
      currency: form.currency,
      code: form.code || null,
      note: form.note || null,
    });
    toast.success(`已入账 · ${form.name}`);
    setForm(initialState);
    setConversionHint(null);
  };

  const amountSymbol = CURRENCY_META[form.currency]?.symbol ?? "";

  return <form onSubmit={handleSubmit} className="space-y-5">
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2"><Label htmlFor="asset-name">资产名称</Label><Input id="asset-name" placeholder="例如：招商银行活期" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} /></div>
      <div className="space-y-2"><Label htmlFor="asset-platform">所在平台</Label><Input id="asset-platform" placeholder="例如：招商银行 / 蚂蚁财富 / 富途" value={form.platform} onChange={(event) => setForm((prev) => ({ ...prev, platform: event.target.value }))} /></div>
    </div>
    <div className="grid gap-4 md:grid-cols-4">
      <div className="space-y-2"><Label>资产类别</Label>
        <Select value={form.category} onValueChange={(value) => setForm((prev) => ({ ...prev, category: value as AssetCategory }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{CATEGORY_ORDER.map((category) => <SelectItem key={category} value={category}>{CATEGORY_LABEL[category]}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-2"><Label>币种</Label>
        <Select value={form.currency} onValueChange={handleCurrencyChange}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{CURRENCY_ORDER.map((code) => <SelectItem key={code} value={code}>{CURRENCY_META[code].symbol} {code} · {CURRENCY_META[code].name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="asset-amount">当前金额{amountSymbol && `（${amountSymbol}）`}</Label>
        <Input id="asset-amount" inputMode="decimal" placeholder="例如：35000" value={form.amount} onChange={(event) => handleAmountChange(event.target.value)} />
        {conversionHint && <p className="text-[11px] text-muted-foreground leading-relaxed">{conversionHint}</p>}
      </div>
      <div className="space-y-2"><Label htmlFor="asset-code">基金/股票代码</Label><Input id="asset-code" placeholder="选填，如 110011" value={form.code} onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))} /></div>
    </div>
    <div className="space-y-2"><Label htmlFor="asset-note">备注</Label><Textarea id="asset-note" placeholder="选填：如买入原因、锁定期等" value={form.note} onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))} /></div>
    <div className="flex justify-end"><Button type="submit" disabled={create.isPending} className="gap-2">{create.isPending ? <Loader2 className="size-4 animate-spin" /> : <PlusCircle className="size-4" />}录入账本</Button></div>
  </form>;
}
