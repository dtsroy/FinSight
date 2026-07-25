/**
 * 个股 code → 名称查询接口（预留接缝）。
 *
 * ⭐️ 唯一需要接真实名称 API 的接缝 ⭐️
 *
 * X 光穿透的 Top10 / 重仓预警都只保留股票代码；显示层通过这里按 code 拿名称。
 * 目前尚未接入外部 API，实现返回空对象 —— 组件在拿不到名称时会退回展示 code 本身。
 *
 * 接入真实接口时替换本函数即可：
 *   - 入参：去重后的 code 数组
 *   - 出参：`{ [code]: name }`；查不到的 code 可以缺省不返回
 */
export async function fetchStockNamesByCodes(
  codes: string[],
): Promise<Record<string, string>> {
  if (codes.length === 0) return {};
  // TODO: 接入外部行情/证券基础信息接口后，在这里发起 HTTP 请求。
  //       例如：`GET ${QUOTE_API_BASE}/get_stock_names?codes=${codes.join(",")}`
  //       响应形状建议：`{ names: { [code]: string } }`
  return {};
}
