// Edge Function 侧的多币种折算表；必须与 src/lib/currency.ts 保持一致。
export const CURRENCY_BASE_RATE: Record<string, number> = {
  CNY: 1,
  USD: 7.1,
  HKD: 0.91,
  EUR: 7.68,
  GBP: 8.9,
  JPY: 0.048,
  SGD: 5.2,
  KRW: 0.0051,
  TWD: 0.22,
  AUD: 4.75,
  CAD: 5.25,
};

export const SUPPORTED_CURRENCIES = new Set(Object.keys(CURRENCY_BASE_RATE));

/** 把任意币种金额折算成人民币等值面额。 */
export function toBaseAmount(amount: number | string | null | undefined, currency?: string | null): number {
  const n = Number(amount);
  if (!Number.isFinite(n)) return 0;
  const code = (typeof currency === "string" ? currency : "CNY").trim().toUpperCase();
  const rate = CURRENCY_BASE_RATE[code] ?? 1;
  return n * rate;
}

export function normalizeCurrencyCode(input: unknown): string {
  const code = (typeof input === "string" ? input : "CNY").trim().toUpperCase();
  return SUPPORTED_CURRENCIES.has(code) ? code : "CNY";
}
