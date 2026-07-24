import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createSharedReport, listSharedReports, revokeSharedReport } from "@/services/reportService";

const QK = ["shared_reports"];

export function useSharedReports() {
  return useQuery({ queryKey: QK, queryFn: listSharedReports });
}

export function useCreateSharedReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { title?: string; valid_days?: number }) => createSharedReport(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
}

export function useRevokeSharedReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => revokeSharedReport(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
}
