import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCreateSharedReport, useRevokeSharedReport, useSharedReports } from "@/hooks/useShareReports";
import { Copy, Link2, ShieldX, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("zh-CN", { hour12: false });
}

export default function ShareReportPanel({ compact }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("季度资产体检报告");
  const [days, setDays] = useState<string>("7");
  const list = useSharedReports();
  const create = useCreateSharedReport();
  const revoke = useRevokeSharedReport();

  function buildUrl(slug: string): string {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/share/${slug}`;
  }

  async function onCreate() {
    try {
      const res = await create.mutateAsync({ title: title.trim() || "季度资产体检报告", valid_days: Number(days) });
      const url = buildUrl(res.slug);
      try {
        await navigator.clipboard.writeText(url);
        toast.success("分享链接已生成并复制到剪贴板");
      } catch {
        toast.success(`分享链接已生成：${url}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "生成失败");
    }
  }

  async function onRevoke(id: string) {
    try {
      await revoke.mutateAsync(id);
      toast.success("已撤销该分享链接");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "撤销失败");
    }
  }

  async function onCopy(slug: string) {
    const url = buildUrl(slug);
    try {
      await navigator.clipboard.writeText(url);
      toast.success("链接已复制");
    } catch {
      toast.success(url);
    }
  }

  const active = (list.data ?? []).filter((r) => !r.revoked_at && new Date(r.expires_at) > new Date());

  const trigger = (
    <Button size={compact ? "sm" : "default"} variant={compact ? "outline" : "default"} className="gap-2">
      <Share2 className="size-4" />生成分享链接
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>季度体检报告 · 只读分享</DialogTitle>
          <DialogDescription>
            生成一份包含最新账本、X 光穿透、压力测试的只读快照，可发给伴侣或家人查看。资产名称会在快照里做脱敏。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div className="space-y-2">
              <Label htmlFor="report-title">报告标题</Label>
              <Input
                id="report-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
              />
            </div>
            <div className="space-y-2">
              <Label>有效期</Label>
              <Select value={days} onValueChange={setDays}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 天</SelectItem>
                  <SelectItem value="3">3 天</SelectItem>
                  <SelectItem value="7">7 天</SelectItem>
                  <SelectItem value="14">14 天</SelectItem>
                  <SelectItem value="30">30 天</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={onCreate} disabled={create.isPending} className="w-full gap-2">
            <Link2 className="size-4" />{create.isPending ? "生成中…" : "生成新分享链接"}
          </Button>
          <div className="rounded-md border border-border bg-secondary/40 p-3">
            <p className="mb-2 text-xs text-muted-foreground">当前活跃的分享链接</p>
            {active.length === 0 ? (
              <p className="text-xs text-muted-foreground">尚未生成任何分享链接。</p>
            ) : (
              <ul className="space-y-2">
                {active.map((r) => (
                  <li key={r.id} className="flex items-center justify-between rounded border border-border bg-card px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <b className="block truncate">{r.title}</b>
                      <span className="block truncate text-xs text-muted-foreground">/share/{r.slug} · 有效至 {formatDateTime(r.expires_at)}</span>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button size="icon" variant="ghost" onClick={() => onCopy(r.slug)} title="复制链接"><Copy className="size-3.5" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => onRevoke(r.id)} title="撤销"><ShieldX className="size-3.5 text-destructive" /></Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
