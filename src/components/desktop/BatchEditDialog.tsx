import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CURRENCY_META, CURRENCY_ORDER } from "@/lib/currency";
import type { AssetBatchPatch, AssetCategory } from "@/types/app/asset";
import { CATEGORY_LABEL, CATEGORY_ORDER } from "@/types/app/asset";
import { useEffect, useState } from "react";

export type BatchField = "platform" | "category" | "currency";

interface BatchEditDialogProps {
  open: boolean;
  field: BatchField;
  count: number;
  saving?: boolean;
  onClose: () => void;
  onConfirm: (patch: AssetBatchPatch) => Promise<void> | void;
  suggestedPlatforms?: string[];
}

export default function BatchEditDialog({
  open,
  field,
  count,
  saving,
  onClose,
  onConfirm,
  suggestedPlatforms = [],
}: BatchEditDialogProps) {
  const [platform, setPlatform] = useState("");
  const [category, setCategory] = useState<AssetCategory>("other");
  const [currency, setCurrency] = useState("CNY");

  useEffect(() => {
    if (open) {
      setPlatform("");
      setCategory("other");
      setCurrency("CNY");
    }
  }, [open, field]);

  const title = field === "platform" ? "批量修改平台" : field === "category" ? "批量修改类别" : "批量修改币种";
  const description = `将对已选的 ${count} 项资产进行同一修改。`;
  const canSubmit = field === "platform" ? platform.trim().length > 0 : true;

  const handleConfirm = async () => {
    if (field === "platform") await onConfirm({ platform: platform.trim() });
    else if (field === "category") await onConfirm({ category });
    else await onConfirm({ currency });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !saving && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {field === "platform" && (
            <div className="space-y-2">
              <Label>新的平台名称</Label>
              <Input
                value={platform}
                onChange={(event) => setPlatform(event.target.value)}
                placeholder="例如：蚂蚁财富、招商银行"
                autoFocus
              />
              {suggestedPlatforms.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-xs text-muted-foreground">已有平台：</span>
                  {suggestedPlatforms.map((name) => (
                    <button
                      key={name}
                      type="button"
                      className="rounded-full border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground transition hover:border-primary hover:text-primary"
                      onClick={() => setPlatform(name)}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {field === "category" && (
            <div className="space-y-2">
              <Label>新的类别</Label>
              <Select value={category} onValueChange={(value) => setCategory(value as AssetCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_ORDER.map((option) => (
                    <SelectItem key={option} value={option}>{CATEGORY_LABEL[option]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {field === "currency" && (
            <div className="space-y-2">
              <Label>新的币种</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCY_ORDER.map((code) => (
                    <SelectItem key={code} value={code}>{CURRENCY_META[code].symbol} {code} · {CURRENCY_META[code].name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">已选的每一项都会按内置参考汇率同步折算金额，人民币等值不变（例如 100 CNY → 14.08 USD）。</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>取消</Button>
          <Button onClick={handleConfirm} disabled={saving || !canSubmit}>
            {saving ? "保存中…" : `应用到 ${count} 项`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
