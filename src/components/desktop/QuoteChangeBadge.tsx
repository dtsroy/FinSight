import { changeToneClass, formatSignedByCurrency, formatSignedPercent } from "@/lib/asset-format";
import type { AssetQuoteChange } from "@/types/app/quote";
import { TrendingDown, TrendingUp } from "lucide-react";

interface QuoteChangeBadgeProps {
  change?: AssetQuoteChange | null;
  loading?: boolean;
  /** 展示形态：inline 用于表格单元格，block 用于卡片下方大字。 */
  variant?: "inline" | "block";
  /** 金额是否保留两位小数（表格里通常 true）。 */
  detailed?: boolean;
  /** 覆盖币种符号；缺省跟随 change.currency。 */
  currency?: string | null;
}

/**
 * 通用涨跌展示：涨绿跌红平灰，同时给出涨跌额与涨跌幅。
 * 拿不到行情（change 为空）时返回 null，让调用方自行决定占位。
 */
export default function QuoteChangeBadge({
  change,
  loading,
  variant = "inline",
  detailed = true,
  currency,
}: QuoteChangeBadgeProps) {
  if (loading) {
    return <span className="text-xs text-muted-foreground/60">…</span>;
  }
  if (!change) return null;

  const tone = changeToneClass(change.changeAmount);
  const Icon = change.changeAmount > 0 ? TrendingUp : change.changeAmount < 0 ? TrendingDown : null;
  const ccy = currency ?? change.currency;
  const amountText = formatSignedByCurrency(change.changeAmount, ccy, detailed);
  const pctText = formatSignedPercent(change.changePct);

  if (variant === "block") {
    return (
      <span className={`inline-flex items-center gap-1.5 font-mono ${tone}`}>
        {Icon && <Icon className="size-4" />}
        <span>{amountText}</span>
        <span className="text-sm opacity-80">({pctText})</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 font-mono text-xs ${tone}`}>
      {Icon && <Icon className="size-3" />}
      <span>{amountText}</span>
      <span className="opacity-80">{pctText}</span>
    </span>
  );
}
