import { getBankLogo } from "@/lib/bank-logos";

interface PlatformCellProps {
  platform: string;
}

// 展示层组件：匹配到银行标识时把 logo 放在文字前；没匹配到就照旧只显示文字。
// 编辑 / 导入 / 批量修改 / 筛选等"匹配阶段"仍使用原始文字字段，不受本组件影响。
export default function PlatformCell({ platform }: PlatformCellProps) {
  const logo = getBankLogo(platform);
  if (!logo) return <span>{platform}</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <img
        src={logo.src}
        alt={logo.label}
        aria-hidden
        className="size-5 shrink-0 rounded-sm"
        loading="lazy"
      />
      <span>{platform}</span>
    </span>
  );
}
