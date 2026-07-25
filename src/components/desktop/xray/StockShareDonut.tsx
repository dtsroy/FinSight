import { formatCurrency } from "@/lib/asset-format";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

/**
 * 穿透后个股相对占比环形图的单条数据。
 * `aggregate` 用于标记「其他 N 只 / 未穿透基金仓位」这类归并项，
 * 视觉上用中性灰色，不与 Top 个股争色阶。
 */
export interface StockShareItem {
  key: string;
  label: string;
  amount: number;
  pct: number;
  aggregate?: boolean;
}

/** Top 个股的前景色阶梯：从深到浅八级，让占比越大的越突出。 */
const TOP_COLORS = [
  "hsl(var(--foreground) / 1)",
  "hsl(var(--foreground) / 0.85)",
  "hsl(var(--foreground) / 0.72)",
  "hsl(var(--foreground) / 0.6)",
  "hsl(var(--foreground) / 0.5)",
  "hsl(var(--foreground) / 0.42)",
  "hsl(var(--foreground) / 0.35)",
  "hsl(var(--foreground) / 0.28)",
];
const AGGREGATE_COLOR = "hsl(var(--muted-foreground) / 0.35)";

function colorFor(index: number, item: StockShareItem): string {
  if (item.aggregate) return AGGREGATE_COLOR;
  return TOP_COLORS[index] ?? AGGREGATE_COLOR;
}

export default function StockShareDonut({ items }: { items: StockShareItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
        暂无穿透后的个股占比可展示。
      </div>
    );
  }
  const top = items[0];
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center">
      <div className="relative mx-auto h-52 w-52 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={items}
              dataKey="pct"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius="62%"
              outerRadius="92%"
              stroke="hsl(var(--card))"
              strokeWidth={1.5}
              animationDuration={800}
            >
              {items.map((it, i) => (
                <Cell key={it.key} fill={colorFor(i, it)} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
                color: "hsl(var(--popover-foreground))",
              }}
              formatter={(_v, _n, payload) => {
                const it = payload?.payload as StockShareItem | undefined;
                if (!it) return "";
                return [`${it.pct.toFixed(1)}%（${formatCurrency(it.amount)}）`, it.label];
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-2xl font-semibold tracking-tight text-foreground">{top.pct.toFixed(1)}%</span>
          <span className="mt-0.5 max-w-[7rem] truncate text-[10px] text-muted-foreground">{top.label}</span>
        </div>
      </div>
      <ul className="flex-1 space-y-1.5 text-xs">
        {items.map((it, i) => (
          <li key={it.key} className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-sm" style={{ background: colorFor(i, it) }} />
              <span className="min-w-0 truncate text-foreground">{it.label}</span>
            </div>
            <span className="shrink-0 font-mono text-muted-foreground">{it.pct.toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
