import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/asset-format";
import { CheckCheck, Coins, Pencil, Trash2, X } from "lucide-react";

interface BatchToolbarProps {
  selectedCount: number;
  selectedSum: number;
  totalMatching: number;
  allMatchingSelected: boolean;
  onSelectAllMatching: () => void;
  onDelete: () => void;
  onEditPlatform: () => void;
  onEditCategory: () => void;
  onEditCurrency: () => void;
  onClearSelection: () => void;
  deleting?: boolean;
  editing?: boolean;
}

export default function BatchToolbar({
  selectedCount,
  selectedSum,
  totalMatching,
  allMatchingSelected,
  onSelectAllMatching,
  onDelete,
  onEditPlatform,
  onEditCategory,
  onEditCurrency,
  onClearSelection,
  deleting,
  editing,
}: BatchToolbarProps) {
  if (selectedCount === 0) return null;

  const showSelectAllHint = !allMatchingSelected && totalMatching > selectedCount;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-primary/25 bg-primary/5 px-5 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/15 px-2.5 py-1 text-sm font-medium text-primary">
          <CheckCheck className="size-4" />已选 {selectedCount} 项
        </span>
        <span className="font-mono text-sm text-muted-foreground">合计 {formatCurrency(selectedSum, true)}<span className="ml-1 text-xs">（折算人民币）</span></span>
        {showSelectAllHint && (
          <Button variant="link" size="sm" className="h-auto px-1 py-0 text-xs" onClick={onSelectAllMatching}>
            选中全部 {totalMatching} 项匹配结果
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" className="gap-1" disabled={editing} onClick={onEditPlatform}>
          <Pencil className="size-3.5" />改平台
        </Button>
        <Button variant="outline" size="sm" className="gap-1" disabled={editing} onClick={onEditCategory}>
          <Pencil className="size-3.5" />改类别
        </Button>
        <Button variant="outline" size="sm" className="gap-1" disabled={editing} onClick={onEditCurrency}>
          <Coins className="size-3.5" />改币种
        </Button>
        <Button
          variant="destructive"
          size="sm"
          className="gap-1"
          disabled={deleting}
          onClick={onDelete}
        >
          <Trash2 className="size-3.5" />批量删除
        </Button>
        <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={onClearSelection}>
          <X className="size-3.5" />取消选择
        </Button>
      </div>
    </div>
  );
}
