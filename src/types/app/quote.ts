import type { AssetCategory } from "@/types/app/asset";

/**
 * 单条资产的涨跌快照。
 * - `changeAmount` 以资产自身币种计价（跟随 `currency`），聚合到总资产时再统一折算成人民币。
 * - `changePct` 为当日涨跌幅百分比：`1.23` 表示 +1.23%。
 */
export interface AssetQuoteChange {
  /** 资产代码（基金/股票代码等）；无代码资产可回落到资产 id。 */
  code: string;
  /** 当日涨跌额，以 `currency` 计价。正数为涨、负数为跌。 */
  changeAmount: number;
  /** 当日涨跌幅（百分比）。正数为涨、负数为跌。 */
  changePct: number;
  /** 计价币种，缺省跟随资产币种。 */
  currency: string;
  /** 行情时间戳（ISO 字符串）。 */
  asOf: string;
}

/**
 * 向行情源查询涨跌时的单条入参。
 * 真实 API 通常只需要 `code`；这里同时带上 `amount` / `currency`，
 * 方便按持仓市值反推涨跌额，也方便脚手架阶段造数据。
 */
export interface QuoteChangeRequest {
  /** 资产 id，作为返回 Map 的主键。 */
  id: string;
  /** 资产代码；手工录入的资产可能为 null。 */
  code: string | null;
  /** 资产类别；只有基金/股票等有行情的类别才会真正去查。 */
  category: AssetCategory;
  /** 当前持仓市值（资产自身币种）。 */
  amount: number;
  /** 资产币种。 */
  currency: string;
}

/** 以资产 id 为键的涨跌结果集合。查不到行情的资产不会出现在 Map 中。 */
export type QuoteChangeMap = Record<string, AssetQuoteChange>;

/**
 * 基金披露的单条重仓股（来自行情后端 /get_fund_zc 的实时数据）。
 * 与 X-Ray 静态底稿 fund_holdings 表同构，可直接替换用于穿透计算。
 */
export interface FundTopHolding {
  /** 底层股票代码（6 位 A 股代码，不带市场后缀）。 */
  stock_code: string;
  /** 占基金净值比例（百分比），`9.5` 表示 9.5%。 */
  weight: number;
}

/**
 * 组合层面的涨跌汇总，币种统一为人民币（CNY）。
 * `changeAmount` 已把各资产的涨跌额按参考/今日汇率折算相加。
 */
export interface PortfolioQuoteChange {
  /** 汇总涨跌额（CNY）。 */
  changeAmount: number;
  /** 汇总涨跌幅（相对于参与计算的持仓市值总额）。 */
  changePct: number;
  /** 参与汇总的资产条数（成功取到行情的）。 */
  covered: number;
}

/** 只有这些类别才被认为「有行情」，需要展示涨跌。 */
export const QUOTED_CATEGORIES: ReadonlySet<AssetCategory> = new Set<AssetCategory>([
  "fund",
  "stock",
]);

export function isQuotedCategory(category: AssetCategory): boolean {
  return QUOTED_CATEGORIES.has(category);
}

/** 行情接口种类：股票走股票源，基金走净值源；null 表示无行情。 */
export type QuoteInstrument = "stock" | "fund";

/** 明确的股票编码段（沪主板 60 / 科创 68 / 深主板·创业 00·30 / 北交所 4·8·92）。 */
const STOCK_CODE_PREFIX_2 = new Set(["60", "68", "30", "43", "83", "87", "92"]);
/** 深市股票三位段：中小板 002 / 主板 001·003（与场外基金 000 段区分开）。 */
const STOCK_CODE_PREFIX_3 = new Set(["001", "002", "003"]);
/** 明确的场内基金编码段（沪市 ETF/LOF 50~58 / 深市 15·16·18）。 */
const FUND_CODE_PREFIX_2 = new Set(["15", "16", "18", "50", "51", "52", "56", "58"]);

/**
 * 「非股票」但仍按基金取净值行情的兜底类别。
 * 现金理财常是货币/理财类基金，用户可能把带 6 位净值代码的场外基金填成这些类别；
 * 只要代码不是明确股票段，就放行按基金行情处理。刻意不含银行存款/债券/保险，
 * 避免它们随手填写的编号被误当成基金去请求。
 */
const FUND_ELIGIBLE_FALLBACK_CATEGORIES: ReadonlySet<AssetCategory> = new Set<AssetCategory>([
  "cash_management",
  "other",
]);

/**
 * 判断一条资产该走「股票」还是「基金」行情接口。
 *
 * 为什么不只看 `category`：手工录入 / OCR / CSV 导入时，基金与股票常被混填，
 * 而「代码」本身携带很强的市场信号（A 股与场内基金的编码段位互不重叠）。
 * 因此优先用代码规则纠偏，代码不足以判断时再回落到用户填写的 `category`。
 *
 * 决策优先级：
 *   1. 代码去除市场前后缀后含字母且非 6 位 A 股格式 → 境外/港美股股票（如 AAPL、00700.HK）。
 *   2. 6 位纯数字代码按段位判断：命中明确基金段 → fund；命中明确股票段 → stock；
 *      未命中股票段但类别属于「现金理财/其他」→ 也按 fund（救回被误分类的场外基金）。
 *   3. 5 位纯数字代码 → 港股股票。
 *   4. 代码无法判断（段位重叠 / 无代码）→ 回落到 `category`。
 *   5. `category` 也非股票/基金 → 返回 null（无行情）。
 */
export function classifyQuoteInstrument(
  code: string | null | undefined,
  category: AssetCategory,
): QuoteInstrument | null {
  const raw = (code ?? "").trim().toUpperCase();
  const digits = raw.replace(/[^0-9]/g, "");
  const hasLetters = /[A-Z]/.test(raw);
  // 4~5) 代码无法判断，回落到用户填写的类别。
  if (category === "stock") return "stock";
  if (category === "fund") return "fund";
  // 1) 字母型代码（且非「6 位数字 + 市场后缀」的 A 股写法）→ 境外股票。
  if (hasLetters && digits.length !== 6) return "stock";

  // 2) 6 位数字：按编码段位纠偏，只在段位明确时覆盖 category。
  if (digits.length === 6) {
    const p2 = digits.slice(0, 2);
    const p3 = digits.slice(0, 3);
    if (FUND_CODE_PREFIX_2.has(p2)) return "fund";
    if (STOCK_CODE_PREFIX_2.has(p2) || STOCK_CODE_PREFIX_3.has(p3)) return "stock";
    // 未命中明确股票段的 6 位数字几乎只能是场外开放式基金：
    // 若类别属于「现金理财/其他」这类非股票兜底类别，也放行按基金取净值。
    if (FUND_ELIGIBLE_FALLBACK_CATEGORIES.has(category)) return "fund";
  }

  // 3) 5 位数字 → 港股。
  if (!hasLetters && digits.length === 5) return "stock";


  return null;
}
