export const ALLOWED_PAGE_SIZES = [10, 20, 30, 50] as const;

export type ValidQuery = { orgCoName: string; pageNo: number; numOfRows: number };

export function validateQuery(params: URLSearchParams):
  | { ok: true; value: ValidQuery }
  | { ok: false; message: string } {
  const orgCoName = (params.get("orgCoName") ?? "").trim();
  const pageNoRaw = params.get("pageNo") ?? "1";
  const rowsRaw = params.get("numOfRows") ?? "10";
  const pageNo = Number(pageNoRaw);
  const numOfRows = Number(rowsRaw);

  if (!orgCoName) return { ok: false, message: "기관명을 입력해 주세요." };
  if (orgCoName.length > 100) return { ok: false, message: "기관명은 100자 이하로 입력해 주세요." };
  if (!/^\d+$/.test(pageNoRaw) || !Number.isSafeInteger(pageNo) || pageNo < 1) {
    return { ok: false, message: "페이지 번호는 1 이상의 정수여야 합니다." };
  }
  if (!/^\d+$/.test(rowsRaw) || !ALLOWED_PAGE_SIZES.includes(numOfRows as 10)) {
    return { ok: false, message: "페이지당 결과 수가 올바르지 않습니다." };
  }
  return { ok: true, value: { orgCoName, pageNo, numOfRows } };
}
