import type { BlindRecruitmentItem, Pagination } from "./types";

const API_URL = "http://apis.data.go.kr/B490007/ncs.go.kr/api/openapi16.do";
type UnknownRecord = Record<string, unknown>;

export class NcsApiError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
  }
}

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const scalar = (value: unknown): string => {
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  if (isRecord(value) && typeof value["#text"] === "string") return value["#text"].trim();
  return "";
};

const positiveNumber = (...values: unknown[]) => {
  for (const value of values) {
    const parsed = Number(scalar(value));
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return 0;
};

function findFirst(root: unknown, keys: string[]): unknown {
  if (Array.isArray(root)) {
    for (const value of root) {
      const found = findFirst(value, keys);
      if (found !== undefined) return found;
    }
  } else if (isRecord(root)) {
    for (const key of keys) if (root[key] !== undefined) return root[key];
    for (const value of Object.values(root)) {
      const found = findFirst(value, keys);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

function collectItems(root: unknown): UnknownRecord[] {
  const found: UnknownRecord[] = [];
  const visit = (value: unknown) => {
    if (Array.isArray(value)) return value.forEach(visit);
    if (!isRecord(value)) return;
    if (
      "orgCoName" in value || "recrFieldDetl" in value || "recrtFieldDetl" in value ||
      "ncsClCdNm" in value || "recrtNo" in value
    ) {
      found.push(value);
      return;
    }
    Object.values(value).forEach(visit);
  };
  visit(root);
  return found;
}

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}

function xmlValue(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeXml(match[1].replace(/<[^>]+>/g, "")) : "";
}

function parseXml(xml: string): UnknownRecord {
  const itemMatches = [...xml.matchAll(/<(?:row|item)(?:\s[^>]*)?>([\s\S]*?)<\/(?:row|item)>/gi)];
  const items = itemMatches.map((match) => ({
    orgCoName: xmlValue(match[1], "orgCoName"),
    recrFieldDetl: xmlValue(match[1], "recrFieldDetl") || xmlValue(match[1], "recrtFieldDetl"),
    ncsClCdNm: xmlValue(match[1], "ncsClCdNm"),
    recrtNo: xmlValue(match[1], "recrtNo"),
  }));
  return {
    resultCode: xmlValue(xml, "resultCode"), resultMsg: xmlValue(xml, "resultMsg"),
    code: xmlValue(xml, "code"), message: xmlValue(xml, "message"),
    pageNo: xmlValue(xml, "pageNo"), numOfRows: xmlValue(xml, "numOfRows"),
    totalCount: xmlValue(xml, "totalCount"), totCnt: xmlValue(xml, "totCnt"),
    totalPage: xmlValue(xml, "totalPage"), items,
  };
}

export function normalizeResponse(raw: unknown, requestedPage: number, requestedRows: number): {
  items: BlindRecruitmentItem[]; pagination: Pagination;
} {
  const resultCode = scalar(findFirst(raw, ["resultCode"]));
  const resultMsg = scalar(findFirst(raw, ["resultMsg", "message"]));
  const code = scalar(findFirst(raw, ["code"]));
  const isEmptyResult = /empty\s*data|no\s*data|데이터가\s*(없|존재하지)|결과가\s*없/i.test(resultMsg);
  const isSuccessMessage = /^(정상|ok|success)$/i.test(resultMsg.trim());
  if (isEmptyResult) {
    return {
      items: [],
      pagination: { pageNo: requestedPage, numOfRows: requestedRows, totalCount: 0, totalPage: 0 },
    };
  }
  if (!isSuccessMessage && resultCode && !["000", "00", "0", "1", "200"].includes(resultCode)) throw new NcsApiError("UPSTREAM_API_ERROR", resultMsg || "공공데이터 조회에 실패했습니다.");
  if (!isSuccessMessage && code && !["000", "00", "0", "1", "200"].includes(code)) throw new NcsApiError("UPSTREAM_API_ERROR", resultMsg || "공공데이터 조회에 실패했습니다.");

  const items = collectItems(raw).map((item) => ({
    orgCoName: scalar(item.orgCoName) || "-",
    recFieldDetl: scalar(item.recrFieldDetl) || scalar(item.recrtFieldDetl) || "-",
    ncsCICdNm: scalar(item.ncsClCdNm) || "-",
    recrtNo: scalar(item.recrtNo) || "-",
  }));
  const pageNo = positiveNumber(findFirst(raw, ["pageNo"])) || requestedPage;
  const numOfRows = positiveNumber(findFirst(raw, ["numOfRows"])) || requestedRows;
  const totalCount = positiveNumber(findFirst(raw, ["totalCount"]), findFirst(raw, ["totCnt"])) || items.length;
  const givenPages = positiveNumber(findFirst(raw, ["totalPage"]));
  const totalPage = givenPages || (totalCount ? Math.ceil(totalCount / numOfRows) : 0);
  return { items, pagination: { pageNo, numOfRows, totalCount, totalPage } };
}

function serviceKey(): string {
  const raw = process.env.DATA_GO_KR_SERVICE_KEY?.trim();
  if (!raw) throw new NcsApiError("CONFIGURATION_ERROR", "서버에 공공데이터 인증키가 설정되지 않았습니다.");
  if (/%[0-9A-Fa-f]{2}/.test(raw)) {
    try { return decodeURIComponent(raw); } catch { return raw; }
  }
  return raw;
}

export async function fetchOrganizations(query: { orgCoName: string; pageNo: number; numOfRows: number }) {
  const params = new URLSearchParams({
    serviceKey: serviceKey(), pageNo: String(query.pageNo), numOfRows: String(query.numOfRows),
    returnType: "json", orgCoName: query.orgCoName,
  });
  let response: Response;
  try {
    response = await fetch(`${API_URL}?${params}`, { signal: AbortSignal.timeout(10000), cache: "no-store" });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new NcsApiError("UPSTREAM_TIMEOUT", "공공데이터 서비스 응답 시간이 초과되었습니다.");
    }
    throw new NcsApiError("UPSTREAM_NETWORK_ERROR", "공공데이터 서비스에 연결할 수 없습니다.");
  }
  if (!response.ok) throw new NcsApiError("UPSTREAM_HTTP_ERROR", `공공데이터 서비스가 오류를 반환했습니다. (${response.status})`);
  const text = await response.text();
  if (!text.trim()) throw new NcsApiError("INVALID_RESPONSE", "공공데이터 서비스에서 빈 응답을 받았습니다.");
  let raw: unknown;
  try { raw = JSON.parse(text); } catch {
    if (text.trimStart().startsWith("<")) raw = parseXml(text);
    else throw new NcsApiError("INVALID_RESPONSE", "공공데이터 응답 형식을 확인할 수 없습니다.");
  }
  return normalizeResponse(raw, query.pageNo, query.numOfRows);
}
