import { Activity } from "lucide-react";

interface DiagnosticHeaderProps { title?: string; eyebrow?: string; description?: string }

export default function DiagnosticHeader({ title = "资产诊断", eyebrow = "FINANCIAL XRAY", description = "用数据看清资产结构与潜在风险。" }: DiagnosticHeaderProps) {
  return <header className="mb-7 flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
    <div><p className="mb-2 font-mono text-[10px] tracking-[.28em] text-primary">{eyebrow}</p><h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1><p className="mt-2 text-sm text-muted-foreground">{description}</p></div>
    <div className="flex items-center gap-2 self-start rounded-full border border-success/30 bg-success/10 px-3 py-1.5 text-xs text-success"><Activity className="size-3.5" />数据体征已更新</div>
  </header>;
}
