export type NormalizedCategory =
  | "bank_deposit"
  | "stock"
  | "fund"
  | "bond"
  | "insurance"
  | "cash_management"
  | "other";

export interface ParsedAssetRow {
  name: string;
  category: NormalizedCategory;
  platform: string;
  amount: number;
  currency: string;
  code: string | null;
  note: string | null;
  errors: string[];
}

const CATEGORY_KEYWORDS: Array<[NormalizedCategory, RegExp]> = [
  ["cash_management", /(余额宝|零钱通|货币|现金理财|理财通|活期理财)/i],
  ["bank_deposit", /(银行|存款|定期|活期|储蓄|大额存单)/i],
  ["stock", /(股票|个股|a股|港股|美股|stock|equity)/i],
  ["fund", /(基金|etf|指数基金|混合基金|债基|fund|lof)/i],
  ["bond", /(债券|国债|企业债|可转债|bond)/i],
  ["insurance", /(保险|万能险|寿险|重疾|年金|保单|insurance)/i],
  ["other", /(其他|other|misc)/i],
];

export function normalizeCategory(input: string, name?: string): NormalizedCategory | null {
  const haystack = `${input || ""} ${name || ""}`.trim();
  if (!haystack) return null;
  for (const [category, pattern] of CATEGORY_KEYWORDS) {
    if (pattern.test(haystack)) return category;
  }
  return null;
}

export const SUPPORTED_CURRENCIES = new Set([
  "CNY", "USD", "HKD", "EUR", "GBP", "JPY", "SGD", "KRW", "TWD", "AUD", "CAD",
]);

/**
 * 将输入规范化为 ISO 币种代码。
 * 输入可能是 string / number / object，先统一转 string 再判断，避免对非字符串调用 .trim() 崩溃。
 * 识别顺序：中文别名 → ISO 代码 → 符号前缀嗅探。均不匹配时返回 null，交由上游决定错误处理或回落到 CNY。
 */
export function normalizeCurrency(input?: unknown): string | null {
  const trimmed = String(input ?? "").trim();
  if (!trimmed) return null;
  const alias: Record<string, string> = {
    "人民币": "CNY", "元": "CNY", "圆": "CNY", "块钱": "CNY", "块": "CNY",
    "美元": "USD", "美金": "USD", "刀": "USD",
    "港币": "HKD", "港元": "HKD",
    "欧元": "EUR",
    "英镑": "GBP",
    "日元": "JPY", "日圆": "JPY",
    "新加坡元": "SGD", "新元": "SGD",
    "韩元": "KRW",
    "新台币": "TWD", "台币": "TWD",
    "澳元": "AUD",
    "加元": "CAD",
  };
  if (alias[trimmed]) return alias[trimmed];
  const upper = trimmed.toUpperCase();
  if (SUPPORTED_CURRENCIES.has(upper)) return upper;
  // 兜底：允许显式传入符号（"$"、"HK$"、"€" 等）
  const symbol = detectCurrencyFromAmount(trimmed);
  if (symbol) return symbol;
  return null;
}

/**
 * 从金额字符串前缀嗅探币种。识别不到时返回 null。
 * 长前缀优先：`HK$` 必须比裸 `$` 早匹配。
 */
export function detectCurrencyFromAmount(input: string): string | null {
  if (!input) return null;
  const trimmed = String(input).trim();
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

export function normalizeAmount(input: string | number | null | undefined): number | null {
  if (input == null) return null;
  if (typeof input === "number" && Number.isFinite(input)) return input;
  // 先剔除组合前缀（HK$/US$/NT$/S$/A$/C$/JP¥），再剔除单字符符号与千分位
  const cleaned = String(input)
    .replace(/^\s*(HK\s*\$|US\s*\$|NT\s*\$|S\s*\$|A\s*\$|C\s*\$|JP\s*[¥￥])/i, "")
    .replace(/[¥￥$€£₩,\s]/g, "")
    .trim();
  if (!cleaned) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

const HEADER_ALIASES: Record<string, string[]> = {
  name: ["name", "名称", "资产名称", "标的", "product", "标的名称"],
  category: ["category", "类别", "分类", "type", "资产类别", "品类"],
  platform: ["platform", "平台", "账户", "机构", "托管平台"],
  amount: ["amount", "金额", "市值", "余额", "value", "current_value", "持有金额"],
  code: ["code", "代码", "证券代码", "基金代码", "symbol"],
  note: ["note", "备注", "notes", "remark"],
  currency: ["currency", "币种", "货币", "币别", "currency_code"],
};

export function detectHeaders(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  headers.forEach((raw, index) => {
    const key = raw.trim().toLowerCase();
    for (const [target, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.some((alias) => alias.toLowerCase() === key)) {
        map[target] = index;
        break;
      }
    }
  });
  return map;
}

export function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      cells.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

const NUMERIC_LIKE = /^(?:HK\s*\$|US\s*\$|NT\s*\$|S\s*\$|A\s*\$|C\s*\$|JP\s*[¥￥]|[¥￥$€£₩])?\s*-?\d+(?:[.,]\d+)?\s*$/i;
const FULLY_NUMERIC = /^-?\d+(?:\.\d+)?$/;

function reconcileCellCount(cells: string[], expected: number, amountIdx?: number): string[] {
  if (cells.length <= expected) return cells;
  if (amountIdx == null) return cells;
  const extra = cells.length - expected;
  if (extra < 1 || amountIdx + extra >= cells.length) return cells;
  const head = cells[amountIdx];
  if (!NUMERIC_LIKE.test(head)) return cells;
  const tail = cells.slice(amountIdx + 1, amountIdx + 1 + extra);
  if (!tail.every((cell) => /^\d{3}(?:\.\d+)?$/.test(cell.trim()))) return cells;
  const combined = [head, ...tail].join(",");
  const cleaned = combined
    .replace(/^\s*(HK\s*\$|US\s*\$|NT\s*\$|S\s*\$|A\s*\$|C\s*\$|JP\s*[¥￥])/i, "")
    .replace(/[¥￥$€£₩,\s]/g, "");
  if (!FULLY_NUMERIC.test(cleaned)) return cells;
  return [
    ...cells.slice(0, amountIdx),
    combined,
    ...cells.slice(amountIdx + 1 + extra),
  ];
}

export function parseCsvText(text: string): ParsedAssetRow[] {
  const cleaned = text.replace(/^\uFEFF/, "").trim();
  const lines = cleaned.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]);
  const headerMap = detectHeaders(headers);
  const parsed: ParsedAssetRow[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const rawCells = splitCsvLine(lines[i]);
    const cells = reconcileCellCount(rawCells, headers.length, headerMap.amount);
    const columnMismatch = cells.length !== headers.length;
    const errors: string[] = [];
    const name = (headerMap.name != null ? cells[headerMap.name] : "").trim();
    const platform = (headerMap.platform != null ? cells[headerMap.platform] : "").trim();
    const rawCategory = (headerMap.category != null ? cells[headerMap.category] : "").trim();
    const rawAmount = headerMap.amount != null ? cells[headerMap.amount] : "";
    const code = (headerMap.code != null ? cells[headerMap.code] : "").trim();
    const note = (headerMap.note != null ? cells[headerMap.note] : "").trim();
    const rawCurrency = (headerMap.currency != null ? cells[headerMap.currency] : "").trim();

    if (columnMismatch) errors.push("字段数量不匹配表头，请检查金额是否包含未引号的千分位");
    if (!name) errors.push("缺少资产名称");
    if (!platform) errors.push("缺少所在平台");
    const category = normalizeCategory(rawCategory, name);
    if (!category) errors.push("无法识别的资产类别，请手动指定");
    const amount = normalizeAmount(rawAmount);
    if (amount == null) errors.push("金额无法解析");
    let currency: string;
    if (rawCurrency) {
      const resolved = normalizeCurrency(rawCurrency);
      if (resolved) {
        currency = resolved;
      } else {
        // 用户明确写了币种但我们识别不了，标错让用户在核对表里显式修正，避免静默默认为人民币
        errors.push(`币种「${rawCurrency}」无法识别，请改为 CNY / USD / HKD / EUR / GBP / JPY / SGD / KRW / TWD / AUD / CAD 之一`);
        currency = "CNY";
      }
    } else {
      currency = detectCurrencyFromAmount(rawAmount || "") ?? "CNY";
    }

    parsed.push({
      name,
      platform,
      category: category ?? "other",
      amount: amount ?? 0,
      currency,
      code: code || null,
      note: note || null,
      errors,
    });
  }
  return parsed;
}
