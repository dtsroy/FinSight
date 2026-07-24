// 平台名 → 品牌标识匹配表（仅供只读展示层使用）。
// 注意：AssetsPage 目前有自己的内联 getPlatformIcon 版本，这里保持同步，方便别的页面复用 / 未来收敛。
// 文件名到品牌的对应由用户在 src/assets/bank-logos/ 目录里直接约定：
//   ccb    → 建设银行            icbc   → 中国工商银行
//   ceb    → 同花顺              pingan → 平安银行 / 平安保险
//   cib    → 兴业银行            wechat → 微信
//   citic  → 中信银行            alipay → 支付宝 / 蚂蚁财富 / 蚂蚁金融
//   cmb    → 招商银行            boc    → 中国银行
//   hsbc   → 汇丰银行            abc    → 农业银行
//   scb    → 渣打银行            bocom  → 交通银行
//   spb    → 浦发银行
// 天天基金暂用官方 App 图标 CDN URL，未来有 SVG 换本地。
// 新增品牌时把 SVG 放进 bank-logos/ 目录，然后在下方 PLATFORM_MATCHERS 追加关键词即可。
import abc from "@/assets/bank-logos/abc.svg";
import alipay from "@/assets/bank-logos/alipay.svg";
import boc from "@/assets/bank-logos/boc.svg";
import bocom from "@/assets/bank-logos/bocom.svg";
import ccb from "@/assets/bank-logos/ccb.svg";
import ceb from "@/assets/bank-logos/ceb.svg";
import cib from "@/assets/bank-logos/cib.svg";
import citic from "@/assets/bank-logos/citic.svg";
import cmb from "@/assets/bank-logos/cmb.svg";
import hsbc from "@/assets/bank-logos/hsbc.svg";
import icbc from "@/assets/bank-logos/icbc.svg";
import pingan from "@/assets/bank-logos/pingan.svg";
import scb from "@/assets/bank-logos/scb.svg";
import spb from "@/assets/bank-logos/spb.svg";
import wechat from "@/assets/bank-logos/wechat.svg";

const TTJJ_LOGO = "https://b.ux-cdn.com/uxarts/20260724/1946e4923f654e58ba3d4fe374930d4d.png";

export interface BankLogo {
  src: string;
  label: string;
}

// 顺序敏感：更长 / 更专的关键词放前面，避免误匹配。
const PLATFORM_MATCHERS: Array<{ keywords: string[]; logo: BankLogo }> = [
  { keywords: ["招商银行", "招行", "cmb"], logo: { src: cmb, label: "招商银行" } },
  { keywords: ["建设银行", "建行", "ccb"], logo: { src: ccb, label: "建设银行" } },
  { keywords: ["中国工商银行", "工商银行", "工行", "icbc"], logo: { src: icbc, label: "中国工商银行" } },
  { keywords: ["中国银行", "中行", "boc"], logo: { src: boc, label: "中国银行" } },
  { keywords: ["农业银行", "农行", "abc"], logo: { src: abc, label: "农业银行" } },
  { keywords: ["交通银行", "交行", "bocom"], logo: { src: bocom, label: "交通银行" } },
  { keywords: ["中信银行", "中信", "citic"], logo: { src: citic, label: "中信银行" } },
  { keywords: ["兴业银行", "兴业", "cib"], logo: { src: cib, label: "兴业银行" } },
  { keywords: ["浦发银行", "浦发", "浦东发展", "spb", "spdb", "spd"], logo: { src: spb, label: "浦发银行" } },
  { keywords: ["平安银行", "平安保险", "平安", "pingan"], logo: { src: pingan, label: "平安" } },
  { keywords: ["汇丰银行", "汇丰", "hsbc"], logo: { src: hsbc, label: "汇丰银行" } },
  { keywords: ["渣打银行", "渣打", "scb", "standard chartered"], logo: { src: scb, label: "渣打银行" } },
  { keywords: ["同花顺", "ths"], logo: { src: ceb, label: "同花顺" } },
  { keywords: ["天天基金", "ttjj"], logo: { src: TTJJ_LOGO, label: "天天基金" } },
  { keywords: ["支付宝", "alipay", "蚂蚁金融", "蚂蚁财富", "蚂蚁"], logo: { src: alipay, label: "支付宝" } },
  { keywords: ["微信", "wechat"], logo: { src: wechat, label: "微信" } },
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
