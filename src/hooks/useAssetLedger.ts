import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  batchDeleteAssets,
  batchUpdateAssets,
  clearDemoAssets,
  createAsset,
  deleteAsset,
  listAssets,
  listAssetsByCategory,
  listAssetsByPlatform,
  listMatchingAssetSummary,
  summarizeAssets,
  updateAsset,
} from "@/services/assetService";
import type { AssetBatchPatch, AssetInput, AssetListFilters } from "@/types/app/asset";

export const ASSET_KEYS = {
  list: (page: number, pageSize: number, filters?: AssetListFilters) =>
    ["assets", "list", page, pageSize, filters ?? {}] as const,
  summary: ["assets", "summary"] as const,
  byCategory: ["assets", "by-category"] as const,
  byPlatform: ["assets", "by-platform"] as const,
};

const invalidateAssetQueries = (client: ReturnType<typeof useQueryClient>) => {
  client.invalidateQueries({ queryKey: ["assets"] });
};

export function useAssetPage(page: number, pageSize = 20, filters?: AssetListFilters, enabled = true) {
  return useQuery({
    queryKey: ASSET_KEYS.list(page, pageSize, filters),
    queryFn: () => listAssets(page, pageSize, filters),
    enabled,
  });
}

export function useAssetSummary(enabled = true) {
  return useQuery({
    queryKey: ASSET_KEYS.summary,
    queryFn: summarizeAssets,
    enabled,
  });
}

export function useAssetsByCategory(enabled = true) {
  return useQuery({
    queryKey: ASSET_KEYS.byCategory,
    queryFn: listAssetsByCategory,
    enabled,
  });
}

export function useAssetsByPlatform(enabled = true) {
  return useQuery({
    queryKey: ASSET_KEYS.byPlatform,
    queryFn: listAssetsByPlatform,
    enabled,
  });
}

export function useCreateAsset() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: AssetInput) => createAsset(input),
    onSuccess: () => invalidateAssetQueries(client),
  });
}

export function useUpdateAsset() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<AssetInput> }) => updateAsset(id, patch),
    onSuccess: () => invalidateAssetQueries(client),
  });
}

export function useDeleteAsset() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAsset(id),
    onSuccess: () => invalidateAssetQueries(client),
  });
}

export function useBatchDeleteAssets() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => batchDeleteAssets(ids),
    onSuccess: () => invalidateAssetQueries(client),
  });
}

export function useBatchUpdateAssets() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, patch }: { ids: string[]; patch: AssetBatchPatch }) =>
      batchUpdateAssets(ids, patch),
    onSuccess: () => invalidateAssetQueries(client),
  });
}

export function useMatchingAssetSummary() {
  return useMutation({
    mutationFn: (filters?: AssetListFilters) => listMatchingAssetSummary(filters),
  });
}

export function useClearDemoAssets() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => clearDemoAssets(),
    onSuccess: () => invalidateAssetQueries(client),
  });
}
