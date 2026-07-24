import { getCurrencyMeta } from "@/lib/currency";

const currency = new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY", maximumFractionDigits: 0 });
const currencyDetailed = new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY", maximumFractionDigits: 2 });
const numberFmt = new Intl.NumberFormat("zh-CN");

export function formatCurrency(value: number, detailed = false): string {
  if (!Number.isFinite(value)) return "¥0";
  return detailed ? currencyDetailed.format(value) : currency.format(value);
}

export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return "¥0";
  if (Math.abs(value) >= 10000) return `¥${(value / 10000).toFixed(1)}万`;
  return currency.format(value);
}

export function formatNumber(value: number): string {
  return numberFmt.format(value);
}

const plainNumber = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 0 });
const plainNumberDetailed = new Intl.NumberFormat("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatByCurrency(value: number, currencyCode?: string | null, detailed = false): string {
  const meta = getCurrencyMeta(currencyCode);
  if (!Number.isFinite(value)) return `${meta.symbol}0`;
  const fmt = detailed ? plainNumberDetailed : plainNumber;
  return `${meta.symbol}${fmt.format(value)}`;
}

/** 带正负号的涨跌额，按币种符号展示，如 `+$12.34` / `-¥56`。零值不带符号。 */
export function formatSignedByCurrency(value: number, currencyCode?: string | null, detailed = false): string {
  const meta = getCurrencyMeta(currencyCode);
  if (!Number.isFinite(value) || value === 0) return `${meta.symbol}0`;
  const fmt = detailed ? plainNumberDetailed : plainNumber;
  const sign = value > 0 ? "+" : "-";
  return `${sign}${meta.symbol}${fmt.format(Math.abs(value))}`;
}

/** 带正负号的涨跌幅百分比，如 `+1.23%` / `-0.50%`。 */
export function formatSignedPercent(pct: number): string {
  if (!Number.isFinite(pct)) return "0.00%";
  const sign = pct > 0 ? "+" : pct < 0 ? "-" : "";
  return `${sign}${Math.abs(pct).toFixed(2)}%`;
}

/** 涨跌方向 → tailwind 文字色 token（涨绿、跌红、平灰，沿用现有配色约定）。 */
export function changeToneClass(value: number): string {
  if (value > 0) return "text-success";
  if (value < 0) return "text-destructive";
  return "text-muted-foreground";
}
