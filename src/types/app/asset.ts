export type AssetCategory =
  | "bank_deposit"
  | "stock"
  | "fund"
  | "bond"
  | "insurance"
  | "cash_management"
  | "other";

export type AssetSource = "manual" | "csv" | "ocr" | "demo";

export interface Asset {
  id: string;
  name: string;
  category: AssetCategory;
  platform: string;
  amount: number;
  currency: string;
  code: string | null;
  purchaseDate: string | null;
  note: string | null;
  source: AssetSource;
  batchId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssetInput {
  name: string;
  category: AssetCategory;
  platform: string;
  amount: number;
  currency?: string;
  code?: string | null;
  purchaseDate?: string | null;
  note?: string | null;
  source?: AssetSource;
  batchId?: string | null;
}

export interface ParsedAssetRow {
  name: string;
  category: AssetCategory;
  platform: string;
  amount: number;
  currency: string;
  code: string | null;
  note: string | null;
  errors: string[];
}

export interface ParseSummary {
  total: number;
  valid: number;
  invalid: number;
}

export interface ImportBatch {
  id: string;
  source: AssetSource;
  status: "pending" | "ready" | "imported" | "partial" | "failed";
  imported: number;
  failed: number;
  fileUrl: string | null;
  note: string | null;
  createdAt: string;
}

export interface CategorySummary {
  category: AssetCategory;
  amount: number;
  count: number;
}

export interface AssetPage {
  rows: Asset[];
  total: number;
}

export interface AssetListFilters {
  search?: string;
  category?: AssetCategory | null;
  platform?: string | null;
  source?: AssetSource | null;
  currency?: string | null;
}

export interface AssetBatchPatch {
  platform?: string;
  category?: AssetCategory;
  currency?: string;
}

export const CATEGORY_LABEL: Record<AssetCategory, string> = {
  bank_deposit: "银行存款",
  stock: "股票",
  fund: "基金",
  bond: "债券",
  insurance: "保险",
  cash_management: "现金理财",
  other: "其他",
};

export const CATEGORY_ORDER: AssetCategory[] = [
  "fund",
  "stock",
  "bank_deposit",
  "cash_management",
  "insurance",
  "bond",
  "other",
];

export const CATEGORY_TONE: Record<AssetCategory, string> = {
  fund: "bg-primary",
  stock: "bg-chart-4",
  bank_deposit: "bg-chart-2",
  cash_management: "bg-warning",
  insurance: "bg-chart-3",
  bond: "bg-info",
  other: "bg-muted-foreground",
};
