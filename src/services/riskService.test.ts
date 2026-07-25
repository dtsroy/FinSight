import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { evaluateRisk, type RiskBasis } from "./riskService";

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
      top_stock_pct: null,
      emergency_months: null,
      max_loss_pct: null,
    };
    const result = evaluateRisk(null, basis);
    expect(result.level).toBe("insufficient_info");
    expect(result.reasons[0]).toContain("缺乏足够");
  });

  it("should evaluate to normal when all metrics are well within safe bounds", () => {
    const basis: RiskBasis = {
      top_stock_pct: 5,
      emergency_months: 12,
      max_loss_pct: 10,
    };
    const result = evaluateRisk(null, basis);
    expect(result.level).toBe("normal");
    expect(result.reasons).toEqual(["各项指标均在健康范围内"]);
  });

  it("should trigger critical if single-stock concentration is > 15%", () => {
    const basis: RiskBasis = {
      top_stock_pct: 18,
      emergency_months: 12,
      max_loss_pct: 10,
    };
    const result = evaluateRisk(null, basis);
    expect(result.level).toBe("critical");
    expect(result.reasons).toEqual(expect.arrayContaining([expect.stringContaining("单只个股持仓过重")]));
  });

  it("should trigger warning if single-stock concentration is > 10% and <= 15%", () => {
    const basis: RiskBasis = {
      top_stock_pct: 12,
      emergency_months: 12,
      max_loss_pct: 10,
    };
    const result = evaluateRisk(null, basis);
    expect(result.level).toBe("warning");
  });

  it("should stay critical while stock stays in hysteresis band across multiple evaluations", () => {
    // 18 → critical
    const state1 = evaluateRisk(null, { top_stock_pct: 18, emergency_months: 12, max_loss_pct: 10 });
    expect(state1.level).toBe("critical");
    expect(state1.subLevels?.top_stock_pct).toBe("critical");

    // 13 (< criticalEnter=15, > criticalExit=12) → stay critical via subLevels
    const state2 = evaluateRisk(state1, { top_stock_pct: 13, emergency_months: 12, max_loss_pct: 10 });
    expect(state2.level).toBe("critical");
    expect(state2.subLevels?.top_stock_pct).toBe("critical");

    // 13 again → still critical (regression case: subLevels-based, not derived-from-value)
    const state3 = evaluateRisk(state2, { top_stock_pct: 13, emergency_months: 12, max_loss_pct: 10 });
    expect(state3.level).toBe("critical");
    expect(state3.subLevels?.top_stock_pct).toBe("critical");

    // 11 (< criticalExit=12) → exit critical, still > warningExit=8 → warning
    const state4 = evaluateRisk(state3, { top_stock_pct: 11, emergency_months: 12, max_loss_pct: 10 });
    expect(state4.level).toBe("warning");
    expect(state4.subLevels?.top_stock_pct).toBe("warning");
  });

  it("should apply hysteresis for emergency months (less is worse)", () => {
    // Drop to 2 -> critical (< 3)
    const state1 = evaluateRisk(null, { top_stock_pct: 5, emergency_months: 2, max_loss_pct: 10 });
    expect(state1.level).toBe("critical");

    // Rise to 3.5 -> stays critical (must be > 4 to exit critical)
    const state2 = evaluateRisk(state1, { top_stock_pct: 5, emergency_months: 3.5, max_loss_pct: 10 });
    expect(state2.level).toBe("critical");

    // Rise to 4.5 -> exits critical, enters warning (since warning exit is 7)
    const state3 = evaluateRisk(state2, { top_stock_pct: 5, emergency_months: 4.5, max_loss_pct: 10 });
    expect(state3.level).toBe("warning");

    // Rise to 8 -> exits warning, enters normal
    const state4 = evaluateRisk(state3, { top_stock_pct: 5, emergency_months: 8, max_loss_pct: 10 });
    expect(state4.level).toBe("normal");
  });
});
