/**
 * LandingSectionHeader — Landing 页每个 section 顶部的三段式标题。
 *
 * 版式：eyebrow（等宽小字 · 追踪距离大）+ title（大字加粗）+ desc（一行说明）。
 * 三块一起构成海报级的信息节奏，同时保证扫读时能一眼分辨"这一段在讲什么"。
 */
interface Props {
  eyebrow: string;
  title: string;
  desc?: string;
  align?: "left" | "center";
}

export default function LandingSectionHeader({
  eyebrow,
  title,
  desc,
  align = "center",
}: Props) {
  const alignClass = align === "center" ? "items-center text-center" : "items-start text-left";
  return (
    <div className={`mb-8 flex flex-col gap-2 ${alignClass}`}>
      <p className="font-mono text-[11px] font-semibold tracking-[.32em] text-foreground/60">
        {eyebrow}
      </p>
      <h2 className="text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
        {title}
      </h2>
      {desc && (
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
          {desc}
        </p>
      )}
    </div>
  );
}
