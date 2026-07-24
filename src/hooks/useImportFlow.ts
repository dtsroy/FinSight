import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ASSET_KEYS } from "@/hooks/useAssetLedger";
import {
  commitParsedBatch,
  listRecentImports,
  parseCsv,
  recognizeHoldings,
  seedDemoPortfolio,
  uploadToStorage,
} from "@/services/importService";
import type { ParsedAssetRow } from "@/types/app/asset";

const invalidateAll = (client: ReturnType<typeof useQueryClient>) => {
  client.invalidateQueries({ queryKey: ["assets"] });
  client.invalidateQueries({ queryKey: ["imports"] });
};

export function useRecentImports(limit = 6) {
  return useQuery({
    queryKey: ["imports", "recent", limit],
    queryFn: () => listRecentImports(limit),
  });
}

export function useCsvParse() {
  return useMutation({
    mutationFn: (csvText: string) => parseCsv(csvText),
  });
}

export function useOcrRecognize() {
  return useMutation({
    mutationFn: async ({ file, platformHint }: { file: File; platformHint?: string }) => {
      const uploaded = await uploadToStorage(file, "screenshots");
      const result = await recognizeHoldings(uploaded.url, platformHint);
      return { ...result, imageUrl: uploaded.url, imageKey: uploaded.key };
    },
  });
}

export function useCommitBatch() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { source: "csv" | "ocr"; rows: ParsedAssetRow[]; fileUrl?: string | null; fileKey?: string | null; note?: string | null }) =>
      commitParsedBatch(input),
    onSuccess: () => invalidateAll(client),
  });
}

export function useSeedDemo() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => seedDemoPortfolio(),
    onSuccess: () => {
      invalidateAll(client);
      client.invalidateQueries({ queryKey: ASSET_KEYS.summary });
    },
  });
}

export function useCsvUpload() {
  return useMutation({
    mutationFn: (file: File) => uploadToStorage(file, "csv"),
  });
}
