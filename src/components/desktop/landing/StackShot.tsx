/**
 * StackShot — 产品实况截图（仪表盘 / X 光 / 压测三窗联动）。
 *
 * 目前源图走用户上传到平台的 CDN URL；如果你已经把 `stack.png` 放到 `src/assets/`，
 * 只需把顶部 DEFAULT_STACK_SHOT 换成：
 *   import stackShot from "@/assets/stack.png";
 * 然后把 default 参数改成 stackShot 即可，其余版式代码无需变动。
 */

const DEFAULT_STACK_SHOT =
  "https://b.ux-cdn.com/uxarts/20260725/1b1c43645a4d4529a9c3a4106fd165be.png";

interface Props {
  src?: string;
  alt?: string;
}

export default function StackShot({
  src = DEFAULT_STACK_SHOT,
  alt = "FinSight 产品实况：仪表盘 · X 光穿透 · 压力测试",
}: Props) {
  return (
    <div className="relative [perspective:1400px]">
      <div className="group/shot relative rounded-2xl border border-border/60 bg-card/40 p-3 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] backdrop-blur-xl transition-all duration-500 ease-out hover:-translate-y-1 hover:shadow-[0_28px_80px_-20px_rgba(0,0,0,0.18)]">
        <div className="flex items-center justify-between border-b border-border/50 pb-2">
          <span className="font-mono text-[10px] font-bold tracking-widest text-muted-foreground/80">
            SHOT · FINSIGHT.IO
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-destructive/60" />
            <span className="size-1.5 rounded-full bg-warning/60" />
            <span className="size-1.5 rounded-full bg-success/60" />
          </span>
        </div>
        <div className="relative mt-3 overflow-hidden rounded-xl bg-white/60 dark:bg-black/10">
          <img
            src={src}
            alt={alt}
            className="w-full select-none"
            draggable={false}
          />
          {/* 暗色模式下给白底截图罩一层柔和的暗色，避免刺眼；亮色模式下无感 */}
          <div className="pointer-events-none absolute inset-0 hidden dark:block bg-gradient-to-b from-black/25 via-transparent to-black/10" />
        </div>
        <p className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>三窗联动 · 账本 → 穿透 → 压测</span>
          <span className="font-mono text-muted-foreground/60">live · demo</span>
        </p>
      </div>
    </div>
  );
}
