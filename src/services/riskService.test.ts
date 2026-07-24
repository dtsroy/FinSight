import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { evaluateRisk, type RiskState, type RiskBasis } from "./riskService";

describe("evaluateRisk", () => {
  const baseTime = "2024-01-01T00:00:00.000Z";

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(baseTime));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return insufficient_info when all data is null", () => {
    const basis: RiskBasis = {
      top_industry_pct: null,
      top_stock_pct: null,
      emergency_months: null,
      max_loss_pct: null,
    };
    const result = evaluateRisk(null, basis);
    expect(result.level).toBe("insufficient_info");
    expect(result.reasons[0]).toContain("部分体检数据缺失");
  });

  it("should evaluate to normal when all metrics are well within safe bounds", () => {
    const basis: RiskBasis = {
      top_industry_pct: 20,
      top_stock_pct: 5,
      emergency_months: 12,
      max_loss_pct: 10,
    };
    const result = evaluateRisk(null, basis);
    expect(result.level).toBe("normal");
    expect(result.reasons).toEqual(["各项指标均在健康范围内"]);
  });

  it("should trigger critical if industry concentration is > 40%", () => {
    const basis: RiskBasis = {
      top_industry_pct: 45,
      top_stock_pct: 5,
      emergency_months: 12,
      max_loss_pct: 10,
    };
    const result = evaluateRisk(null, basis);
    expect(result.level).toBe("critical");
    expect(result.reasons).toEqual(expect.arrayContaining([expect.stringContaining("单一行业集中度过高")]));
  });

  it("should trigger warning if industry concentration is > 30% and <= 40%", () => {
    const basis: RiskBasis = {
      top_industry_pct: 35,
      top_stock_pct: 5,
      emergency_months: 12,
      max_loss_pct: 10,
    };
    const result = evaluateRisk(null, basis);
    expect(result.level).toBe("warning");
  });

  it("should apply hysteresis for critical to warning transition (industry pct drops from 45 to 38, stays critical)", () => {
    const basis1: RiskBasis = { top_industry_pct: 45, top_stock_pct: 5, emergency_months: 12, max_loss_pct: 10 };
    const state1 = evaluateRisk(null, basis1);
    expect(state1.level).toBe("critical");

    // Drop to 38, which is < 40 but > 35, should stay critical
    const basis2: RiskBasis = { top_industry_pct: 38, top_stock_pct: 5, emergency_months: 12, max_loss_pct: 10 };
    const state2 = evaluateRisk(state1, basis2);
    expect(state2.level).toBe("critical");

    // Drop to 34, which is < 35, should exit critical and enter warning
    const basis3: RiskBasis = { top_industry_pct: 34, top_stock_pct: 5, emergency_months: 12, max_loss_pct: 10 };
    const state3 = evaluateRisk(state2, basis3);
    expect(state3.level).toBe("warning");
  });

  it("should apply hysteresis for emergency months (less is worse)", () => {
    // Drop to 2 -> critical (< 3)
    const state1 = evaluateRisk(null, { top_industry_pct: 10, top_stock_pct: 5, emergency_months: 2, max_loss_pct: 10 });
    expect(state1.level).toBe("critical");

    // Rise to 3.5 -> stays critical (must be > 4 to exit critical)
    const state2 = evaluateRisk(state1, { top_industry_pct: 10, top_stock_pct: 5, emergency_months: 3.5, max_loss_pct: 10 });
    expect(state2.level).toBe("critical");

    // Rise to 4.5 -> exits critical, enters warning (since warning exit is 7)
    const state3 = evaluateRisk(state2, { top_industry_pct: 10, top_stock_pct: 5, emergency_months: 4.5, max_loss_pct: 10 });
    expect(state3.level).toBe("warning");

    // Rise to 8 -> exits warning, enters normal
    const state4 = evaluateRisk(state3, { top_industry_pct: 10, top_stock_pct: 5, emergency_months: 8, max_loss_pct: 10 });
    expect(state4.level).toBe("normal");
  });
});