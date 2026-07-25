import logoUrl from "@/assets/icon.svg";
import { cn } from "@/lib/utils";

type SiteLogoProps = {
  /** 图标尺寸类名（如 "size-8"），默认 size-10 */
  iconClassName?: string;
  /** 品牌文字；传 null 只显示图标 */
  label?: string | null;
  /** 品牌文字类名；传空字符串则完全继承父级样式 */
  textClassName?: string;
  className?: string;
};

export default function SiteLogo({
  iconClassName = "size-10",
  label = "FinSight",
  textClassName = "font-bold tracking-tight text-foreground",
  className,
}: SiteLogoProps) {
  return (
    <span className={cn("flex items-center gap-3", className)}>
      <img src={logoUrl} alt={label ?? "FinSight"} className={cn("shrink-0 rounded-lg object-contain", iconClassName)} />
      {label ? <span className={textClassName}>{label}</span> : null}
    </span>
  );
}
