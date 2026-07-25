export type RiskLevel = "normal" | "warning" | "critical" | "insufficient_info";
export type SubLevel = "normal" | "warning" | "critical";

export interface RiskBasis {
  top_stock_pct: number | null;
  emergency_months: number | null;
  max_loss_pct: number | null;
}

export interface RiskState {
  level: RiskLevel;
  reasons: string[];
  evaluatedAt: string;
  basis: RiskBasis;
  /**
   * 每项指标当次评估后的子等级。持久化以支持滞回：
   * 例如 stock 从 18 掉到 13 应停留在 critical（>criticalExit=12），
   * 再降到 13、13 也要一直停留；如果只根据"上一次数值 + 进入阈值"重建，
   * 第二次 13 会因为 13 < criticalEnter=15 而被误判回落。缺省时退化为按数值重建。
   */
  subLevels?: {
    top_stock_pct: SubLevel;
    emergency_months: SubLevel;
    max_loss_pct: SubLevel;
  };
}

interface Rule {
  criticalEnter: number;
  criticalExit: number;
  warningEnter: number;
  warningExit: number;
  isLess: boolean;
}

const RULES: { stock: Rule; emergency: Rule; loss: Rule } = {
  stock: { criticalEnter: 15, criticalExit: 12, warningEnter: 10, warningExit: 8, isLess: false },
  emergency: { criticalEnter: 3, criticalExit: 4, warningEnter: 6, warningExit: 7, isLess: true },
  loss: { criticalEnter: 30, criticalExit: 25, warningEnter: 20, warningExit: 15, isLess: false },
};

/** 按当前数值 + 上一次子等级，套滞回规则算出这一次的子等级。 */
function checkHysteresis(
  currentValue: number | null,
  prevLevel: SubLevel,
  r: Rule,
): SubLevel {
  if (currentValue === null) return "normal";

  const isCritical = r.isLess ? currentValue < r.criticalEnter : currentValue > r.criticalEnter;
  const criticalExited = r.isLess ? currentValue > r.criticalExit : currentValue < r.criticalExit;
  const isWarning = r.isLess ? currentValue < r.warningEnter : currentValue > r.warningEnter;
  const warningExited = r.isLess ? currentValue > r.warningExit : currentValue < r.warningExit;

  if (prevLevel === "critical") {
    if (!criticalExited) return "critical";
    if (!warningExited) return "warning";
    return "normal";
  }
  if (prevLevel === "warning") {
    if (isCritical) return "critical";
    if (!warningExited) return "warning";
    return "normal";
  }
  // prev = "normal"
  if (isCritical) return "critical";
  if (isWarning) return "warning";
  return "normal";
}

/**
 * 兜底：老版本 RiskState 没有 subLevels 字段时，用"上一次的 basis 值 + 进入阈值"
 * 粗略重建上一次子等级。仅在数据迁移期使用，无 prev 或 prev 没有该指标就当 "normal"。
 */
function reconstructSubLevel(value: number | null, r: Rule): SubLevel {
  if (value === null) return "normal";
  if (r.isLess ? value < r.criticalEnter : value > r.criticalEnter) return "critical";
  if (r.isLess ? value < r.warningEnter : value > r.warningEnter) return "warning";
  return "normal";
}

function prevSubLevel(
  prev: RiskState | null,
  metric: keyof RiskBasis,
  r: Rule,
): SubLevel {
  if (!prev) return "normal";
  if (prev.subLevels && prev.subLevels[metric]) return prev.subLevels[metric];
  return reconstructSubLevel(prev.basis[metric] ?? null, r);
}

export function evaluateRisk(prev: RiskState | null, basis: RiskBasis): RiskState {
  if (
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

  const stkLevel = checkHysteresis(
    basis.top_stock_pct,
    prevSubLevel(prev, "top_stock_pct", RULES.stock),
    RULES.stock,
  );
  if (stkLevel === "critical") {
    isCritical = true;
    reasons.push(`单只个股持仓过重（${basis.top_stock_pct?.toFixed(1)}%）`);
  } else if (stkLevel === "warning") {
    isWarning = true;
    reasons.push(`单只个股持仓偏重（${basis.top_stock_pct?.toFixed(1)}%）`);
  }

  const emgLevel = checkHysteresis(
    basis.emergency_months,
    prevSubLevel(prev, "emergency_months", RULES.emergency),
    RULES.emergency,
  );
  if (emgLevel === "critical") {
    isCritical = true;
    reasons.push(`应急储备严重不足（仅够 ${basis.emergency_months?.toFixed(1)} 个月）`);
  } else if (emgLevel === "warning") {
    isWarning = true;
    reasons.push(`应急储备偏低（可支撑 ${basis.emergency_months?.toFixed(1)} 个月）`);
  }

  const lossLevel = checkHysteresis(
    basis.max_loss_pct,
    prevSubLevel(prev, "max_loss_pct", RULES.loss),
    RULES.loss,
  );
  if (lossLevel === "critical") {
    isCritical = true;
    reasons.push(`极端行情下预估回撤极大（${basis.max_loss_pct?.toFixed(1)}%）`);
  } else if (lossLevel === "warning") {
    isWarning = true;
    reasons.push(`极端行情下预估回撤较大（${basis.max_loss_pct?.toFixed(1)}%）`);
  }

  if (reasons.length === 0) {
    if (basis.top_stock_pct === null || basis.max_loss_pct === null) {
      return {
        level: "insufficient_info",
        reasons: ["部分体检数据缺失，请完成 X 光穿透与压力测试"],
        evaluatedAt: new Date().toISOString(),
        basis,
        subLevels: {
          top_stock_pct: stkLevel,
          emergency_months: emgLevel,
          max_loss_pct: lossLevel,
        },
      };
    }
    reasons.push("各项指标均在健康范围内");
  }

  return {
    level: isCritical ? "critical" : isWarning ? "warning" : "normal",
    reasons,
    evaluatedAt: new Date().toISOString(),
    basis,
    subLevels: {
      top_stock_pct: stkLevel,
      emergency_months: emgLevel,
      max_loss_pct: lossLevel,
    },
  };
}
