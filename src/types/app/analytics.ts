export interface XRayStockSource {
  fund_code: string | null;
  fund_name: string | null;
  amount: number;
  direct: boolean;
}

/**
 * X 光穿透后的一只个股。
 *
 * 名称展示由前端根据 stock_code 通过外部接口异步查询后补齐（见 stockNameService），
 * 本地不再从 stock_industry 表推断，也不再输出行业字段。
 */
export interface XRayStock {
  stock_code: string;
  amount: number;
  pct: number;
  sources: XRayStockSource[];
}

/**
 * 跨基金重仓个股：同一支股票被 2 只及以上基金同时持有。
 * 名称同样由前端后续接入外部接口按 code 查询。
 */
export interface XRayDuplicateHolding {
  stock_code: string;
  total_pct: number;
  total_amount: number;
  funds: { fund_code: string; fund_name: string; amount: number }[];
}

export interface XRayAlert {
  level: "critical" | "warning" | "info";
  title: string;
  message: string;
}

export interface XRayReport {
  id: string;
  user_id: string;
  total_amount: number;
  fund_amount: number;
  stock_amount: number;
  cash_amount: number;
  top_stocks: XRayStock[];
  duplicate_holdings: XRayDuplicateHolding[];
  alerts: XRayAlert[];
  unmatched_funds: { code: string | null; name: string; amount: number; reason?: string }[];
  created_at: string;
}

export interface StressTestBreakdown {
  key: string;
  label: string;
  before: number;
  after: number;
  loss: number;
}

export interface StressTestRun {
  id: string;
  user_id: string;
  scenario: string;
  scenario_label: string;
  estimated_loss: number;
  loss_pct: number;
  recovery_days: number | null;
  emergency_months: number | null;
  detail: {
    desc?: string;
    breakdown?: StressTestBreakdown[];
    summary?: string;
    monthly_expense?: number;
    cash_cover?: number;
    shortfall?: number;
  };
  created_at: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  tone: "friendly" | "sharp" | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface UserProfile {
  user_id: string;
  monthly_expense: number;
  updated_at: string;
}

export interface SharedReportRecord {
  id: string;
  title: string;
  slug: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
}

export interface SharedReportSnapshot {
  title: string;
  generated_at: string;
  portfolio: {
    total: number;
    count: number;
    byCategory: Record<string, number>;
    byPlatform: Record<string, number>;
    items: {
      name: string;
      category: string;
      platform: string | null;
      amount: number;
      currency: string;
    }[];
  };
  xray: null | {
    created_at: string;
    total_amount: number;
    top_stocks: { stock_code: string; amount: number; pct: number; sources: { fund_name: string | null; direct: boolean; amount: number }[] }[];
    duplicate_holdings: { stock_code: string; total_pct: number; total_amount: number; funds: { fund_name: string; amount: number }[] }[];
    alerts: XRayAlert[];
  };
  stress_tests: StressTestRun[];
  profile: { monthly_expense: number };
}
