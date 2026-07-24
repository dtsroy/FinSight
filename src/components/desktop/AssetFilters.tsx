import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CURRENCY_META, CURRENCY_ORDER } from "@/lib/currency";
import type { AssetListFilters } from "@/types/app/asset";
import { CATEGORY_LABEL, CATEGORY_ORDER } from "@/types/app/asset";
import { Search, X } from "lucide-react";

const ALL = "__all__";

interface AssetFiltersProps {
  filters: AssetListFilters;
  platforms: string[];
  onChange: (next: AssetListFilters) => void;
}

export default function AssetFilters({ filters, platforms, onChange }: AssetFiltersProps) {
  const active =
    (filters.search?.trim().length ?? 0) > 0 ||
    filters.category != null ||
    filters.platform != null ||
    filters.currency != null;

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card px-5 py-3">
      <div className="relative min-w-[220px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.search ?? ""}
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
          placeholder="按名称或代码搜索"
          className="pl-9"
        />
      </div>

      <Select
        value={filters.category ?? ALL}
        onValueChange={(value) =>
          onChange({ ...filters, category: value === ALL ? null : (value as AssetListFilters["category"]) })
        }
      >
        <SelectTrigger className="w-[130px]"><SelectValue placeholder="类别" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>全部类别</SelectItem>
          {CATEGORY_ORDER.map((category) => (
            <SelectItem key={category} value={category}>{CATEGORY_LABEL[category]}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.platform ?? ALL}
        onValueChange={(value) =>
          onChange({ ...filters, platform: value === ALL ? null : value })
        }
      >
        <SelectTrigger className="w-[150px]"><SelectValue placeholder="平台" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>全部平台</SelectItem>
          {platforms.map((platform) => (
            <SelectItem key={platform} value={platform}>{platform}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.currency ?? ALL}
        onValueChange={(value) =>
          onChange({ ...filters, currency: value === ALL ? null : value })
        }
      >
        <SelectTrigger className="w-[130px]"><SelectValue placeholder="币种" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>全部币种</SelectItem>
          {CURRENCY_ORDER.map((code) => (
            <SelectItem key={code} value={code}>{CURRENCY_META[code].symbol} {code}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {active && (
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-muted-foreground"
          onClick={() => onChange({ search: "", category: null, platform: null, source: null, currency: null })}
        >
          <X className="size-3.5" />清除
        </Button>
      )}
    </div>
  );
}
