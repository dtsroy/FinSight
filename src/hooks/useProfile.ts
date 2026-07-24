import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getProfile, upsertMonthlyExpense } from "@/services/profileService";

const QK = ["user_profile"];

export function useProfile() {
  return useQuery({ queryKey: QK, queryFn: getProfile });
}

export function useUpdateMonthlyExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (value: number) => upsertMonthlyExpense(value),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK });
      qc.invalidateQueries({ queryKey: ["stress_runs"] });
    },
  });
}
