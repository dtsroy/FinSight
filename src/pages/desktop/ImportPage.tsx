import DiagnosticHeader from "@/components/desktop/DiagnosticHeader";
import CsvImportFlow from "@/components/desktop/import/CsvImportFlow";
import DemoLoader from "@/components/desktop/import/DemoLoader";
import ManualAssetForm from "@/components/desktop/import/ManualAssetForm";
import OcrImportFlow from "@/components/desktop/import/OcrImportFlow";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRecentImports } from "@/hooks/useImportFlow";
import { formatCompact } from "@/lib/asset-format";
import { FileSpreadsheet, Keyboard, ScanEye } from "lucide-react";
import { Link } from "react-router-dom";

const sourceLabel: Record<string, string> = { manual: "手动录入", csv: "CSV 批量", ocr: "截图识别", demo: "演示载入" };

export default function ImportPage() {
  const recent = useRecentImports(5);

  return <div className="space-y-8">
    <DiagnosticHeader title="导入你的资产" eyebrow="ASSET INTAKE" description="把散落在各平台的资产放到一张底片上，之后所有诊断都基于这份账本。" />
    <DemoLoader />

    <section>
      <Tabs defaultValue="manual" className="space-y-4">
        <TabsList className="w-full flex-wrap justify-start gap-2 bg-transparent p-0">
          <TabsTrigger value="manual" className="gap-2 rounded-md border border-border bg-card px-4 py-2 data-[state=active]:border-primary/40 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"><Keyboard className="size-4" />手动录入</TabsTrigger>
          <TabsTrigger value="csv" className="gap-2 rounded-md border border-border bg-card px-4 py-2 data-[state=active]:border-primary/40 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"><FileSpreadsheet className="size-4" />CSV 批量</TabsTrigger>
          <TabsTrigger value="ocr" className="gap-2 rounded-md border border-border bg-card px-4 py-2 data-[state=active]:border-primary/40 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"><ScanEye className="size-4" />截图 OCR</TabsTrigger>
        </TabsList>
        <TabsContent value="manual" className="rounded-lg border border-border bg-card p-5">
          <ManualAssetForm />
        </TabsContent>
        <TabsContent value="csv"><CsvImportFlow /></TabsContent>
        <TabsContent value="ocr"><OcrImportFlow /></TabsContent>
      </Tabs>
    </section>

    <section className="rounded-lg border border-border bg-card p-5">
      <header className="mb-4 flex items-center justify-between">
        <div><b>最近的导入记录</b><p className="mt-1 text-xs text-muted-foreground">每一次入账都会保留一份档案，方便回看当时选中了哪些资产。</p></div>
        <Link to="/assets" className="text-xs text-primary hover:underline">查看完整账本 →</Link>
      </header>
      {recent.isLoading ? <div className="py-6 text-center text-sm text-muted-foreground">正在加载导入记录…</div> :
        (recent.data && recent.data.length > 0) ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-xs text-muted-foreground"><tr className="text-left"><th className="py-2">时间</th><th className="py-2">来源</th><th className="py-2">状态</th><th className="py-2 text-right">入账 / 失败</th></tr></thead>
          <tbody className="divide-y divide-border">
            {recent.data.map((row) => <tr key={row.id}>
              <td className="py-2 font-mono text-xs text-muted-foreground">{new Date(row.createdAt).toLocaleString("zh-CN", { hour12: false })}</td>
              <td className="py-2">{sourceLabel[row.source] ?? row.source}</td>
              <td className="py-2"><StatusTag status={row.status} /></td>
              <td className="py-2 text-right font-mono">{row.imported} / {row.failed}</td>
            </tr>)}
          </tbody></table></div>
        : <p className="py-6 text-center text-sm text-muted-foreground">还没有导入记录，先用上面的方式把资产录进来吧。</p>}
    </section>
    <p className="text-xs text-muted-foreground">提示：截图、CSV 与手动录入的数据都保存在你专属的账本中，只有登录的本人能看见。稍后新增账户与真实登录后，这份账本会跟随你的账号迁移。<span className="text-foreground/70">「金额」= {formatCompact(0)} 起，支持 0 元占位。</span></p>
  </div>;
}

function StatusTag({ status }: { status: string }) {
  const map: Record<string, { text: string; className: string }> = {
    pending: { text: "解析中", className: "bg-warning/15 text-warning border-warning/30" },
    ready: { text: "待确认", className: "bg-info/15 text-info border-info/30" },
    imported: { text: "已入账", className: "bg-success/15 text-success border-success/30" },
    partial: { text: "部分入账", className: "bg-warning/15 text-warning border-warning/30" },
    failed: { text: "失败", className: "bg-destructive/10 text-destructive border-destructive/30" },
  };
  const info = map[status] ?? { text: status, className: "bg-muted text-muted-foreground border-border" };
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] ${info.className}`}>{info.text}</span>;
}
