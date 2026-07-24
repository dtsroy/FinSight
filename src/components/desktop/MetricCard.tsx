import type { LucideIcon } from "lucide-react";

interface MetricCardProps { label?: string; value?: string; note?: string; icon?: LucideIcon; tone?: "normal" | "warn" | "danger" }

export default function MetricCard({ label = "指标", value = "—", note = "暂无数据", icon: Icon, tone = "normal" }: MetricCardProps) {
  const toneClass = tone === "danger" ? "text-destructive" : tone === "warn" ? "text-warning" : "text-primary";
  return <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
    <div className="flex items-center justify-between text-sm text-muted-foreground"><span>{label}</span>{Icon && <Icon className={`size-4 ${toneClass}`} />}</div>
    <strong className={`mt-4 block font-mono text-3xl tracking-tight md:text-4xl ${toneClass}`}>{value}</strong>
    <p className="mt-3 text-xs text-muted-foreground">{note}</p>
  </section>;
}
