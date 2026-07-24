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
