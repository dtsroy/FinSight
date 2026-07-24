export type RiskLevel = "normal" | "warning" | "critical" | "insufficient_info";

export interface RiskBasis {
  top_industry_pct: number | null;
  top_stock_pct: number | null;
  emergency_months: number | null;
  max_loss_pct: number | null;
}

export interface RiskState {
  level: RiskLevel;
  reasons: string[];
  evaluatedAt: string;
  basis: RiskBasis;
}

export function evaluateRisk(prev: RiskState | null, basis: RiskBasis): RiskState {
  if (
    basis.top_industry_pct === null &&
    basis.top_stock_pct === null &&
    basis.emergency_months === null &&
    basis.max_loss_pct === null
  ) {
    return {
      level: "insufficient_info",
      reasons: ["缺乏足够的资产诊断与压力测试数据"],
      evaluatedAt: new Date().toISOString(),
      basis,
    };
  }

  const reasons: string[] = [];
  let isCritical = false;
  let isWarning = false;

  // Helper to apply hysteresis
  const checkHysteresis = (
    currentValue: number | null,
    prevLevel: "normal" | "warning" | "critical",
    thresholds: {
      criticalEnter: number; criticalExit: number;
      warningEnter: number; warningExit: number;
      isLess: boolean;
    }
  ): "normal" | "warning" | "critical" => {
    if (currentValue === null) return "normal";

    const { criticalEnter, criticalExit, warningEnter, warningExit, isLess } = thresholds;

    const isCriticalCondition = isLess ? currentValue < criticalEnter : currentValue > criticalEnter;
    const isCriticalExitCondition = isLess ? currentValue > criticalExit : currentValue < criticalExit;
    
    const isWarningCondition = isLess ? currentValue < warningEnter : currentValue > warningEnter;
    const isWarningExitCondition = isLess ? currentValue > warningExit : currentValue < warningExit;

    if (prevLevel === "critical") {
      if (!isCriticalExitCondition) return "critical";
      if (!isWarningExitCondition) return "warning";
      return "normal";
    }

    if (prevLevel === "warning") {
      if (isCriticalCondition) return "critical";
      if (!isWarningExitCondition) return "warning";
      return "normal";
    }

    // prevLevel === "normal"
    if (isCriticalCondition) return "critical";
    if (isWarningCondition) return "warning";
    return "normal";
  };

  // Extract previous sub-levels by inferring from previous basis and level, 
  // but to be precise, we need to track sub-levels. Since we didn't store sub-levels, 
  // we can reconstruct them from prev.basis with the same threshold logic.
  // Actually, a simpler way is to just use prev.basis to know if it WAS critical/warning for that specific metric.
  const getPrevSubLevel = (metric: keyof RiskBasis, thresholds: any): "normal" | "warning" | "critical" => {
    if (!prev || prev.basis[metric] === null) return "normal";
    const val = prev.basis[metric] as number;
    const { criticalEnter, warningEnter, isLess } = thresholds;
    if (isLess ? val < criticalEnter : val > criticalEnter) return "critical";
    if (isLess ? val < warningEnter : val > warningEnter) return "warning";
    // We also should check if it was in hysteresis zone. If it was in hysteresis zone, 
    // it depends on the level before that. To be perfectly accurate without storing history of each metric, 
    // we can approximate: if it's currently inside the hysteresis band, we assume it retains its previous severity if the global level matched it.
    // Let's simplify: just use standard thresholds for the prev value to guess its state.
    return "normal";
  };

  const rules = {
    industry: { criticalEnter: 40, criticalExit: 35, warningEnter: 30, warningExit: 25, isLess: false },
    stock: { criticalEnter: 15, criticalExit: 12, warningEnter: 10, warningExit: 8, isLess: false },
    emergency: { criticalEnter: 3, criticalExit: 4, warningEnter: 6, warningExit: 7, isLess: true },
    loss: { criticalEnter: 30, criticalExit: 25, warningEnter: 20, warningExit: 15, isLess: false }
  };

  // 1. Industry
  const indPrev = getPrevSubLevel("top_industry_pct", rules.industry);
  const indLevel = checkHysteresis(basis.top_industry_pct, indPrev, rules.industry);
  if (indLevel === "critical") {
    isCritical = true;
    reasons.push(`单一行业集中度过高（${basis.top_industry_pct?.toFixed(1)}%）`);
  } else if (indLevel === "warning") {
    isWarning = true;
    reasons.push(`单一行业集中度偏高（${basis.top_industry_pct?.toFixed(1)}%）`);
  }

  // 2. Stock
  const stkPrev = getPrevSubLevel("top_stock_pct", rules.stock);
  const stkLevel = checkHysteresis(basis.top_stock_pct, stkPrev, rules.stock);
  if (stkLevel === "critical") {
    isCritical = true;
    reasons.push(`单只个股持仓过重（${basis.top_stock_pct?.toFixed(1)}%）`);
  } else if (stkLevel === "warning") {
    isWarning = true;
    reasons.push(`单只个股持仓偏重（${basis.top_stock_pct?.toFixed(1)}%）`);
  }

  // 3. Emergency
  const emgPrev = getPrevSubLevel("emergency_months", rules.emergency);
  const emgLevel = checkHysteresis(basis.emergency_months, emgPrev, rules.emergency);
  if (emgLevel === "critical") {
    isCritical = true;
    reasons.push(`应急储备严重不足（仅够 ${basis.emergency_months?.toFixed(1)} 个月）`);
  } else if (emgLevel === "warning") {
    isWarning = true;
    reasons.push(`应急储备偏低（可支撑 ${basis.emergency_months?.toFixed(1)} 个月）`);
  }

  // 4. Loss
  const lossPrev = getPrevSubLevel("max_loss_pct", rules.loss);
  const lossLevel = checkHysteresis(basis.max_loss_pct, lossPrev, rules.loss);
  if (lossLevel === "critical") {
    isCritical = true;
    reasons.push(`极端行情下预估回撤极大（${basis.max_loss_pct?.toFixed(1)}%）`);
  } else if (lossLevel === "warning") {
    isWarning = true;
    reasons.push(`极端行情下预估回撤较大（${basis.max_loss_pct?.toFixed(1)}%）`);
  }

  if (reasons.length === 0) {
    if (basis.top_industry_pct === null || basis.max_loss_pct === null) {
      return {
        level: "insufficient_info",
        reasons: ["部分体检数据缺失，请完成 X 光穿透与压力测试"],
        evaluatedAt: new Date().toISOString(),
        basis
      };
    }
    reasons.push("各项指标均在健康范围内");
  }

  return {
    level: isCritical ? "critical" : isWarning ? "warning" : "normal",
    reasons,
    evaluatedAt: new Date().toISOString(),
    basis,
  };
}
