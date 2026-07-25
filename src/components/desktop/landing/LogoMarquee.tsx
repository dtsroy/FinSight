/**
 * LogoMarquee — 无限横向滚动 logo 卡组。
 *
 * 用途：Landing 页「使用的服务」「支持 OCR 的银行 / 机构」两行反向滚动。
 * 每张卡里：
 *  - `src` 有值时渲染 <img>；
 *  - `src` 缺省时渲染 dashed 空位（提示"SVG 待补"）——用户后续补图只需把 src 填上即可，
 *    版式代码零改动。
 *
 * 无缝循环靠 items 复制两遍并列 + CSS `translateX(-50%)` 实现（keyframes 定义在 index.css）。
 */

export interface LogoMarqueeItem {
  label: string;
  /** SVG / PNG 图标 URL。缺省时会渲染 dashed 空位提示 SVG 待补 */
  src?: string;
  /** 可选的一句话注释（数据源用途 / 银行简称等），显示在 label 下方 */
  note?: string;
}

interface Props {
  items: LogoMarqueeItem[];
  /** left 表示视觉上从右滑向左；right 反之 */
  direction?: "left" | "right";
  /** 每张卡的固定宽度（px），保证滚动步长稳定，默认 180 */
  cardWidth?: number;
}

export default function LogoMarquee({ items, direction = "left", cardWidth = 180 }: Props) {
  if (items.length === 0) return null;
  const trackClass = direction === "left" ? "marquee-track" : "marquee-track-reverse";
  // items 复制两遍以实现无缝循环（translateX -50% 时第二份的起点刚好对齐视口起点）
  const rendered = [...items, ...items];
  return (
    <div className="marquee-wrapper py-2">
      <div className={trackClass}>
        {rendered.map((it, i) => (
          <div
            key={`${it.label}-${i}`}
            style={{ width: cardWidth }}
            className="mx-2 flex shrink-0 flex-col items-center justify-center gap-2 rounded-xl border border-border/60 bg-card/50 px-4 py-4 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-border hover:bg-card hover:shadow-sm"
          >
            <div className="flex h-10 w-full items-center justify-center">
              {it.src ? (
                <img
                  src={it.src}
                  alt={it.label}
                  className="h-full max-h-10 w-auto object-contain"
                  draggable={false}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-border/70 font-mono text-[10px] tracking-[.2em] text-muted-foreground/60">
                  SVG · PENDING
                </div>
              )}
            </div>
            <div className="line-clamp-1 text-center text-xs font-medium text-foreground">
              {it.label}
            </div>
            {it.note && (
              <div className="line-clamp-1 text-center text-[10px] text-muted-foreground/70">
                {it.note}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
