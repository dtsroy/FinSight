import { useRef, useState } from "react";

/**
 * XRayScannerPanel — Landing 页复用的"医学影像雷达"外壳。
 *
 * 承包所有共性视觉：scanner-line 扫描动画、鼠标追随的 3D 倾斜、`AGENT · …` 头条、
 * 「诊断分析中」呼吸徽章、底部 footer 说明。内部渲染任意 children，
 * 让 X 光页的 StockShareDonut / IndustryDistributionBar 直接嵌进来复用。
 */
interface Props {
  title: string;
  subtitle?: string;
  footerNote?: string;
  /** 3D 倾斜幅度（角度），默认 10。整数即可。 */
  tiltDeg?: number;
  children: React.ReactNode;
}

export default function XRayScannerPanel({
  title,
  subtitle,
  footerNote,
  tiltDeg = 10,
  children,
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    setRotation({
      x: -((y - centerY) / centerY) * tiltDeg,
      y: ((x - centerX) / centerX) * tiltDeg,
    });
  }

  function handleMouseLeave() {
    setRotation({ x: 0, y: 0 });
  }

  return (
    <div className="group [perspective:1000px] relative h-full">
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="radiograph-panel relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-2xl transition-all duration-200 ease-out hover:scale-[1.02] hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] md:p-6"
        style={{
          transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
        }}
      >
        <div className="scanner-line" />
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <span className="font-mono text-xs font-bold tracking-widest text-muted-foreground/80">
            {title}
          </span>
          <span className="relative flex items-center gap-2 rounded-full border border-foreground/20 bg-foreground/5 px-3 py-1 text-[10px] font-semibold text-foreground">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-foreground opacity-40"></span>
              <span className="relative inline-flex size-2 rounded-full bg-foreground"></span>
            </span>
            诊断分析中
          </span>
        </div>
        {subtitle && (
          <p className="mt-3 text-sm font-medium text-foreground">{subtitle}</p>
        )}
        <div className="relative z-20 mt-4 flex flex-1 items-center">
          <div className="w-full">{children}</div>
        </div>
        {footerNote && (
          <p className="relative z-20 mt-4 border-t border-border/40 pt-3 text-[11px] leading-5 text-muted-foreground">
            {footerNote}
          </p>
        )}
      </div>
    </div>
  );
}
