import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getLatestStressRuns, runStressTest } from "@/services/stressService";

export function useLatestStressRuns() {
  return useQuery({ queryKey: ["stress_runs"], queryFn: getLatestStressRuns });
}

export function useRunStressTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (scenarios?: string[]) => runStressTest(scenarios),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stress_runs"] });
    },
  });
}
