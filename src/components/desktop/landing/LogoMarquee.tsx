/**
 * LogoMarquee — 无限横向滚动 logo 卡组。
 *
 * 用途：Landing 页「使用的服务」「支持 OCR 的银行 / 机构」两行反向滚动。
 *
 * 两种展示模式：
 *  1. 默认（hideLabel=false）：logo + label（+ 可选 note），用于"服务栈"这种需要文字辅助的场景；
 *  2. hideLabel=true：只显示 logo，套一个统一的白底外框，适合"银行 / 机构 logo 墙"这种视觉纯净场景。
 *
 * 每张卡：
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
  /** 可选的一句话注释（数据源用途 / 银行简称等），显示在 label 下方。仅在 hideLabel=false 时生效 */
  note?: string;
}

interface Props {
  items: LogoMarqueeItem[];
  /** left 表示视觉上从右滑向左；right 反之 */
  direction?: "left" | "right";
  /** 每张卡的固定宽度（px），保证滚动步长稳定，默认 180 */
  cardWidth?: number;
  /**
   * 隐藏文字（label / note），仅展示 logo。
   * 打开后卡片会切成"白底 + 品牌 logo 居中"的统一外框样式，
   * 用于品牌墙类展示（不同银行的品牌色都能在白底上稳定表现）。
   */
  hideLabel?: boolean;
}

export default function LogoMarquee({
  items,
  direction = "left",
  cardWidth = 180,
  hideLabel = false,
}: Props) {
  if (items.length === 0) return null;
  const trackClass = direction === "left" ? "marquee-track" : "marquee-track-reverse";
  // items 复制两遍以实现无缝循环（translateX -50% 时第二份的起点刚好对齐视口起点）
  const rendered = [...items, ...items];

  // 两种卡片风格：
  //  - hideLabel=true：白底 + 品牌 logo 居中，固定高度 116px，视觉纯净；
  //  - 默认：透明卡片 + logo + 文字。
  const cardBase = hideLabel
    ? "mx-2 flex h-[104px] shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-white px-2 py-2 shadow-sm ring-1 ring-black/[0.02] transition-all duration-300 hover:-translate-y-0.5 hover:border-border hover:shadow-md dark:bg-white/95"
    : "mx-2 flex shrink-0 flex-col items-center justify-center gap-2 rounded-xl border border-border/60 bg-card/50 px-4 py-4 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-border hover:bg-card hover:shadow-sm";

  return (
    <div className="marquee-wrapper py-2">
      <div className={trackClass}>
        {rendered.map((it, i) => (
          <div
            key={`${it.label}-${i}`}
            style={{ width: cardWidth }}
            className={cardBase}
            title={it.label}
          >
            {hideLabel ? (
              // 品牌墙模式：只放 logo，撑满卡片高度但留呼吸空间
              it.src ? (
                <img
                  src={it.src}
                  alt={it.label}
                  className="max-h-[128px] max-w-[90%] object-contain"
                  draggable={false}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-neutral-300 font-mono text-[10px] tracking-[.2em] text-neutral-400">
                  SVG · PENDING
                </div>
              )
            ) : (
              <>
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
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
