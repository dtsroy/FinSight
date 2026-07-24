import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfile, useUpdateMonthlyExpense } from "@/hooks/useProfile";
import { formatCurrency } from "@/lib/asset-format";
import { Settings2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface Props { trigger?: React.ReactNode }

export default function MonthlyExpenseDialog({ trigger }: Props) {
  const [open, setOpen] = useState(false);
  const profile = useProfile();
  const update = useUpdateMonthlyExpense();
  const [amount, setAmount] = useState<string>("");

  useEffect(() => {
    if (open) setAmount(String(profile.data?.monthly_expense ?? 15000));
  }, [open, profile.data]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 0) {
      toast.error("请输入合理的金额");
      return;
    }
    try {
      await update.mutateAsync(value);
      toast.success(`月度硬性支出已更新为 ${formatCurrency(value)}`);
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
            <Settings2 className="size-4" /> 月度硬性支出：{formatCurrency(profile.data?.monthly_expense ?? 15000)}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>设置每月硬性支出</DialogTitle>
          <DialogDescription>
            用于压力测试的"失业+急用钱"情景。房贷、房租、子女教育、必要生活开销等加起来的月度金额。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="monthly-expense">月度硬性支出 (元)</Label>
            <Input
              id="monthly-expense"
              type="number"
              min={0}
              step={500}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="例如 15000"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>取消</Button>
            <Button type="submit" disabled={update.isPending}>{update.isPending ? "保存中…" : "保存"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
