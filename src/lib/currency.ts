export interface CurrencyMeta {
  code: string;
  symbol: string;
  name: string;
  /** 参考汇率：`amount * baseRate` 得到对应的人民币金额。 */
  baseRate: number;
}

export const CURRENCY_META: Record<string, CurrencyMeta> = {
  CNY: { code: "CNY", symbol: "¥", name: "人民币", baseRate: 1 },
  USD: { code: "USD", symbol: "$", name: "美元", baseRate: 7.1 },
  HKD: { code: "HKD", symbol: "HK$", name: "港币", baseRate: 0.91 },
  EUR: { code: "EUR", symbol: "€", name: "欧元", baseRate: 7.68 },
  GBP: { code: "GBP", symbol: "£", name: "英镑", baseRate: 8.9 },
  JPY: { code: "JPY", symbol: "JP¥", name: "日元", baseRate: 0.048 },
  SGD: { code: "SGD", symbol: "S$", name: "新加坡元", baseRate: 5.2 },
  KRW: { code: "KRW", symbol: "₩", name: "韩元", baseRate: 0.0051 },
  TWD: { code: "TWD", symbol: "NT$", name: "新台币", baseRate: 0.22 },
  AUD: { code: "AUD", symbol: "A$", name: "澳元", baseRate: 4.75 },
  CAD: { code: "CAD", symbol: "C$", name: "加元", baseRate: 5.25 },
};

export const CURRENCY_ORDER: string[] = [
  "CNY",
  "USD",
  "HKD",
  "EUR",
  "GBP",
  "JPY",
  "SGD",
  "TWD",
  "KRW",
  "AUD",
  "CAD",
];

export const SUPPORTED_CURRENCIES = new Set(Object.keys(CURRENCY_META));

export function isSupportedCurrency(code?: string | null): boolean {
  if (!code) return false;
  return SUPPORTED_CURRENCIES.has(code.trim().toUpperCase());
}

/** 将任意入参规范化为支持币种代码；未知走 CNY 兼底。 */
export function toValidCurrency(code?: string | null): string {
  if (!code) return "CNY";
  const upper = code.trim().toUpperCase();
  return SUPPORTED_CURRENCIES.has(upper) ? upper : "CNY";
}

export function getCurrencyMeta(code?: string | null): CurrencyMeta {
  if (!code) return CURRENCY_META.CNY;
  const upper = code.toUpperCase();
  return CURRENCY_META[upper] ?? { code: upper, symbol: `${upper} `, name: upper, baseRate: 1 };
}

export function toBaseAmount(amount: number, currency?: string | null): number {
  if (!Number.isFinite(amount)) return 0;
  return amount * getCurrencyMeta(currency).baseRate;
}

export type FxRateMap = Record<string, number>;

/**
 * 用一份「1 单位该币种 = 多少人民币」的汇率表来换算金额。
 * 缺表或缺目标币种时回落到 CURRENCY_META.baseRate，保证 UI 永远能出结果。
 */
export function rateToCny(code: string, rates?: FxRateMap | null): number {
  const upper = toValidCurrency(code);
  if (rates && Number.isFinite(rates[upper]) && rates[upper] > 0) return rates[upper];
  return getCurrencyMeta(upper).baseRate;
}

/**
 * 把 `amount` 从 `fromCode` 换到 `toCode`。默认走硬编码 baseRate，传入 fresh rates 时按今日汇率换算。
 * 返回全精度浮点——展示层自己去 round（用 `formatAmountForInput`）；保存到 DB 时优先使用本函数的原始返回值，
 * 避免“改币 → UI 截断 → 回写 DB”中间因 0.01 取整而造成总资产 CNY 等值漂移。
 */
export function convertAmount(
  amount: number,
  fromCode: string,
  toCode: string,
  rates?: FxRateMap | null,
): number {
  if (!Number.isFinite(amount)) return amount;
  const from = toValidCurrency(fromCode);
  const to = toValidCurrency(toCode);
  if (from === to) return amount;
  const cny = amount * rateToCny(from, rates);
  const targetRate = rateToCny(to, rates);
  if (!(targetRate > 0)) return amount;
  const converted = cny / targetRate;
  if (!Number.isFinite(converted)) return amount;
  return converted;
}

/**
 * 金额输入框用的统一解析：去掉千位分隔、币种符号与空白；空字符串或不可解析时返回 null。
 */
export function parseAmountInput(raw: string): number | null {
  const cleaned = raw.replace(/[,¥$€£₩\s]/g, "");
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

/**
 * 金额回写到输入框时的格式化：整数不留小数，非整数则保留2 位；非法值返回空串。
 */
export function formatAmountForInput(num: number): string {
  if (!Number.isFinite(num)) return "";
  return num % 1 === 0 ? String(Math.round(num)) : num.toFixed(2);
}

/**
 * 从金额字符串里嗅探币种符号；识别不到时返回 null 交由上游默认。
 * 检查顺序按前缀长度：`HK$` 必须比 `$` 更先命中。
 */
export function detectCurrencyFromAmount(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^HK\s*\$/i.test(trimmed)) return "HKD";
  if (/^S\s*\$/i.test(trimmed)) return "SGD";
  if (/^NT\s*\$/i.test(trimmed)) return "TWD";
  if (/^US\s*\$/i.test(trimmed)) return "USD";
  if (/^A\s*\$/i.test(trimmed)) return "AUD";
  if (/^C\s*\$/i.test(trimmed)) return "CAD";
  if (/^JP\s*[¥￥]/i.test(trimmed)) return "JPY";
  if (/^\$/.test(trimmed)) return "USD";
  if (/^€/.test(trimmed)) return "EUR";
  if (/^£/.test(trimmed)) return "GBP";
  if (/^₩/.test(trimmed)) return "KRW";
  if (/^[¥￥]/.test(trimmed)) return "CNY";
  return null;
}
