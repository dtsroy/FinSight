import { useState, useEffect, useCallback } from "react";
import { useAccountIdentity } from "@/hooks/useAuthGuard";
import { useLatestXRay } from "@/hooks/useXray";
import { useLatestStressRuns } from "@/hooks/useStress";
import { evaluateRisk, type RiskState, type RiskBasis } from "@/services/riskService";

export function useRisk() {
  const { userId } = useAccountIdentity();
  const xray = useLatestXRay();
  const stress = useLatestStressRuns();

  const [state, setState] = useState<RiskState | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!userId) {
      setState(null);
      setIsLoaded(true);
      return;
    }
    const saved = localStorage.getItem(`finsight_risk_${userId}`);
    if (saved) {
      try {
        setState(JSON.parse(saved));
      } catch {
        setState(null);
      }
    } else {
      setState(null);
    }
    setIsLoaded(true);
  }, [userId]);

  const evaluate = useCallback(() => {
    if (!userId) return;

    const xrayData = xray.data;
    const stressData = stress.data;

    let emergency_months = null;
    let max_loss_pct = null;
    if (stressData && stressData.length > 0) {
      const months = stressData.map(r => r.emergency_months).filter((v): v is number => v != null);
      if (months.length > 0) emergency_months = Math.min(...months);

      const losses = stressData.map(r => r.loss_pct).filter((v): v is number => v != null);
      if (losses.length > 0) max_loss_pct = Math.max(...losses);
    }

    const basis: RiskBasis = {
      top_stock_pct: xrayData?.top_stocks?.[0]?.pct ? Number(xrayData.top_stocks[0].pct) : null,
      emergency_months,
      max_loss_pct,
    };

    setState((prev) => {
      const next = evaluateRisk(prev, basis);
      localStorage.setItem(`finsight_risk_${userId}`, JSON.stringify(next));
      return next;
    });
  }, [userId, xray.data, stress.data]);

  // Auto-evaluate when underlying data updates
  useEffect(() => {
    if (!isLoaded) return;
    if (xray.isLoading || stress.isLoading) return;
    evaluate();
  }, [evaluate, isLoaded, xray.isLoading, stress.isLoading]);

  return { state, evaluate };
}
