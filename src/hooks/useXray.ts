import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getLatestXRay, runXRayScan } from "@/services/xrayService";

export function useLatestXRay() {
  return useQuery({ queryKey: ["xray_latest"], queryFn: getLatestXRay });
}

export function useRunXRay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => runXRayScan(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["xray_latest"] });
    },
  });
}
