import { formatCurrency } from "@/lib/asset-format";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/**
 * 完整行业分布柱状图的一条数据。
 * - `top`：Top 5 行业本尊，用主前景色；
 * - `other`：Top 5 之外的所有已识别行业合并，中性灰；
 * - `unknown`：穿透后未能识别行业的个股金额，暖色警示；
 * - `unmatched`：披露不足 / 底稿未收录的基金仓位，红色警示。
 */
export type IndustryBarKind = "top" | "other" | "unknown" | "unmatched";

export interface IndustryBarItem {
  key: string;
  label: string;
  amount: number;
  pct: number;
  kind: IndustryBarKind;
}

const KIND_COLOR: Record<IndustryBarKind, string> = {
  top: "hsl(var(--foreground))",
  other: "hsl(var(--muted-foreground) / 0.55)",
  unknown: "hsl(var(--warning) / 0.8)",
  unmatched: "hsl(var(--destructive) / 0.7)",
};

export default function IndustryDistributionBar({ items }: { items: IndustryBarItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
        暂无可绘制的行业分布数据。
      </div>
    );
  }
  // 每条 32px + 40px margin，让 4~8 条数据都有清爽的呼吸感。
  const height = Math.max(200, items.length * 36 + 40);
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={items} layout="vertical" margin={{ top: 6, right: 24, left: 0, bottom: 6 }}>
          <CartesianGrid horizontal={false} stroke="hsl(var(--border) / 0.5)" />
          <XAxis
            type="number"
            tickFormatter={(v) => `${v}%`}
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={92}
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            tick={{ fill: "hsl(var(--foreground))" }}
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--secondary) / 0.4)" }}
            contentStyle={{
              background: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
              color: "hsl(var(--popover-foreground))",
            }}
            formatter={(_v, _n, payload) => {
              const it = payload?.payload as IndustryBarItem | undefined;
              if (!it) return "";
              return [`${it.pct.toFixed(1)}%（${formatCurrency(it.amount)}）`, it.label];
            }}
          />
          <Bar dataKey="pct" radius={[0, 4, 4, 0]} maxBarSize={22} animationDuration={800}>
            {items.map((it) => (
              <Cell key={it.key} fill={KIND_COLOR[it.kind]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
