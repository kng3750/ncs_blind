import { describe, expect, it } from "vitest";
import { NcsApiError, normalizeResponse } from "../lib/ncs-api";

describe("normalizeResponse", () => {
  it("단일 항목을 배열로 정규화하고 페이지 수를 계산한다", () => {
    const result = normalizeResponse({ response: { header: { resultCode: "00" }, body: { pageNo: 1, numOfRows: 10, totalCount: 21, items: { item: { orgCoName: "한국산업인력공단", recFieldDetl: "건축", ncsCICdNm: "대분류 > 중분류" } } } } }, 1, 10);
    expect(result.items).toHaveLength(1);
    expect(result.pagination.totalPage).toBe(3);
  });
  it("배열 항목과 totCnt/totalPage를 처리한다", () => {
    const result = normalizeResponse({ code: "1", totCnt: "2", totalPage: "1", items: [{ orgCoName: "가" }, { orgCoName: "나" }] }, 1, 10);
    expect(result.items.map((item) => item.orgCoName)).toEqual(["가", "나"]);
    expect(result.pagination.totalCount).toBe(2);
  });
  it("누락 필드에는 대시를 사용한다", () => expect(normalizeResponse({ items: [{ orgCoName: "기관" }] }, 1, 10).items[0].recFieldDetl).toBe("-"));
  it("실패 결과 코드를 오류로 변환한다", () => expect(() => normalizeResponse({ resultCode: "99", resultMsg: "실패" }, 1, 10)).toThrow(NcsApiError));
  it("empty data 응답은 오류가 아닌 빈 검색 결과로 처리한다", () => {
    const result = normalizeResponse({ resultCode: "03", resultMsg: "empty data" }, 2, 20);
    expect(result).toEqual({ items: [], pagination: { pageNo: 2, numOfRows: 20, totalCount: 0, totalPage: 0 } });
  });
  it("정상 메시지가 있으면 문서와 다른 상태 코드도 성공으로 처리한다", () => {
    const result = normalizeResponse({ resultCode: "999", message: "정상", items: [{ orgCoName: "한국기관" }] }, 1, 10);
    expect(result.items[0].orgCoName).toBe("한국기관");
  });
});
