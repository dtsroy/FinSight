// 平台名 → 品牌标识匹配表（仅供只读展示层使用）。
// 文件名到品牌的对应由用户在 src/assets/bank-logos/ 目录里直接约定：
//   ccb  → 建设银行
//   ceb  → 同花顺（历史文件名沿用，不代表光大银行）
//   cib  → 兴业银行
//   citic→ 中信银行
//   cmb  → 招商银行
//   hsbc → 汇丰银行
//   scb  → 渣打银行
//   spb  → 浦发银行
// 新增品牌时把 SVG 放进 bank-logos/ 目录，然后在下方 PLATFORM_MATCHERS 追加关键词即可。
import ccb from "@/assets/bank-logos/ccb.svg";
import ceb from "@/assets/bank-logos/ceb.svg";
import cib from "@/assets/bank-logos/cib.svg";
import citic from "@/assets/bank-logos/citic.svg";
import cmb from "@/assets/bank-logos/cmb.svg";
import hsbc from "@/assets/bank-logos/hsbc.svg";
import scb from "@/assets/bank-logos/scb.svg";
import spb from "@/assets/bank-logos/spb.svg";

export interface BankLogo {
  src: string;
  label: string;
}

// 顺序敏感：更长 / 更专的关键词放在前面，避免误匹配。
const PLATFORM_MATCHERS: Array<{ keywords: string[]; logo: BankLogo }> = [
  { keywords: ["招商银行", "招行", "cmb"], logo: { src: cmb, label: "招商银行" } },
  { keywords: ["建设银行", "建行", "ccb"], logo: { src: ccb, label: "建设银行" } },
  { keywords: ["兴业银行", "兴业", "cib"], logo: { src: cib, label: "兴业银行" } },
  { keywords: ["浦发银行", "浦发", "浦东发展", "spb", "spdb", "spd"], logo: { src: spb, label: "浦发银行" } },
  { keywords: ["中信银行", "中信", "citic"], logo: { src: citic, label: "中信银行" } },
  { keywords: ["汇丰银行", "汇丰", "hsbc"], logo: { src: hsbc, label: "汇丰银行" } },
  { keywords: ["渣打银行", "渣打", "scb", "standard chartered"], logo: { src: scb, label: "渣打银行" } },
  { keywords: ["同花顺", "ths"], logo: { src: ceb, label: "同花顺" } },
];

export function getBankLogo(platform: string | null | undefined): BankLogo | null {
  if (!platform) return null;
  const s = platform.toLowerCase();
  for (const { keywords, logo } of PLATFORM_MATCHERS) {
    for (const kw of keywords) {
      if (s.includes(kw.toLowerCase())) return logo;
    }
  }
  return null;
}
