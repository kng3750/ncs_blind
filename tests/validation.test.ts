import { describe, expect, it } from "vitest";
import { validateQuery } from "../lib/validation";

describe("validateQuery", () => {
  it("기관명의 공백을 제거하고 기본 페이지를 적용한다", () => {
    const result = validateQuery(new URLSearchParams({ orgCoName: "  한국  " }));
    expect(result).toEqual({ ok: true, value: { orgCoName: "한국", pageNo: 1, numOfRows: 10 } });
  });
  it("빈 기관명을 거부한다", () => expect(validateQuery(new URLSearchParams())).toMatchObject({ ok: false }));
  it("잘못된 페이지와 결과 수를 거부한다", () => {
    expect(validateQuery(new URLSearchParams({ orgCoName: "한국", pageNo: "0" })).ok).toBe(false);
    expect(validateQuery(new URLSearchParams({ orgCoName: "한국", pageNo: "1000" })).ok).toBe(false);
    expect(validateQuery(new URLSearchParams({ orgCoName: "한국", numOfRows: "9" })).ok).toBe(false);
    expect(validateQuery(new URLSearchParams({ orgCoName: "한국", numOfRows: "101" })).ok).toBe(false);
  });
  it("명세 범위 안의 페이지당 표시 건수를 허용한다", () => {
    expect(validateQuery(new URLSearchParams({ orgCoName: "한국", numOfRows: "15" })).ok).toBe(true);
  });
});
