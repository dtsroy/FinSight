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
