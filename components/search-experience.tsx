"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ApiResponse, BlindRecruitmentItem, Pagination } from "@/lib/types";

const EMPTY_PAGE: Pagination = { pageNo: 1, numOfRows: 10, totalCount: 0, totalPage: 0 };

function SearchIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/></svg>;
}

function Classification({ value }: { value: string }) {
  const parts = value === "-" ? [value] : value.split("> ").flatMap((part) => part.split(">")).map((part) => part.trim()).filter(Boolean);
  return <div className="classification" aria-label={`NCS 분류: ${value}`}>{parts.map((part, index) => <span key={`${part}-${index}`}>{part}</span>)}</div>;
}

function ResultCard({ item, number }: { item: BlindRecruitmentItem; number: number }) {
  return (
    <article className="mobile-card">
      <div className="mobile-card-head"><span className="number-badge">{number}</span><h3>{item.orgCoName}</h3></div>
      <dl><div><dt>채용 분야</dt><dd>{item.recFieldDetl}</dd></div><div><dt>NCS 분류</dt><dd><Classification value={item.ncsCICdNm} /></dd></div></dl>
    </article>
  );
}

function pageNumbers(current: number, total: number): Array<number | "ellipsis"> {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const values: Array<number | "ellipsis"> = [1];
  const start = Math.max(2, current - 1), end = Math.min(total - 1, current + 1);
  if (start > 2) values.push("ellipsis");
  for (let page = start; page <= end; page++) values.push(page);
  if (end < total - 1) values.push("ellipsis");
  values.push(total);
  return values;
}

export default function SearchExperience() {
  const router = useRouter();
  const urlParams = useSearchParams();
  const initialQuery = (urlParams.get("orgCoName") ?? "").trim();
  const initialPage = Math.max(1, Number(urlParams.get("pageNo")) || 1);
  const allowedRows = [10, 20, 30, 50];
  const rowsFromUrl = Number(urlParams.get("numOfRows"));
  const initialRows = allowedRows.includes(rowsFromUrl) ? rowsFromUrl : 10;
  const [input, setInput] = useState(initialQuery);
  const [activeQuery, setActiveQuery] = useState(initialQuery);
  const [items, setItems] = useState<BlindRecruitmentItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ ...EMPTY_PAGE, pageNo: initialPage, numOfRows: initialRows });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "empty" | "error">(initialQuery ? "loading" : "idle");
  const [error, setError] = useState("");
  const resultsRef = useRef<HTMLElement>(null);
  const requestId = useRef(0);

  const load = useCallback(async (query: string, pageNo: number, numOfRows: number, scroll = false) => {
    const id = ++requestId.current;
    const controller = new AbortController();
    setStatus("loading"); setError("");
    try {
      const params = new URLSearchParams({ orgCoName: query, pageNo: String(pageNo), numOfRows: String(numOfRows) });
      const response = await fetch(`/api/organizations?${params}`, { signal: controller.signal });
      const body = await response.json() as ApiResponse;
      if (id !== requestId.current) return;
      if (!body.success) throw new Error(body.error.message);
      setItems(body.data.items); setPagination(body.data.pagination);
      setStatus(body.data.items.length ? "success" : "empty");
      if (scroll) requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (caught) {
      if (id !== requestId.current || (caught instanceof DOMException && caught.name === "AbortError")) return;
      setItems([]); setStatus("error"); setError(caught instanceof Error ? caught.message : "정보를 불러오지 못했습니다.");
    }
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (initialQuery) void load(initialQuery, initialPage, initialRows);
    // URL의 최초 상태로 한 번만 조회하며 이후 변경은 이벤트에서 처리합니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateUrl = (query: string, pageNo: number, numOfRows: number) => {
    const params = new URLSearchParams({ orgCoName: query, pageNo: String(pageNo), numOfRows: String(numOfRows) });
    router.push(`/?${params}`, { scroll: false });
  };

  const search = (event: FormEvent) => {
    event.preventDefault();
    const query = input.trim();
    if (!query) { setStatus("error"); setError("검색할 기관명을 입력해 주세요."); return; }
    if (query.length > 100) { setStatus("error"); setError("기관명은 100자 이하로 입력해 주세요."); return; }
    setInput(query); setActiveQuery(query); updateUrl(query, 1, pagination.numOfRows);
    void load(query, 1, pagination.numOfRows, true);
  };

  const goToPage = (pageNo: number) => {
    if (!activeQuery || pageNo < 1 || pageNo > pagination.totalPage || pageNo === pagination.pageNo) return;
    updateUrl(activeQuery, pageNo, pagination.numOfRows); void load(activeQuery, pageNo, pagination.numOfRows, true);
  };

  const changeRows = (numOfRows: number) => {
    setPagination((current) => ({ ...current, numOfRows }));
    if (!activeQuery) return;
    updateUrl(activeQuery, 1, numOfRows); void load(activeQuery, 1, numOfRows, true);
  };

  return (
    <div className="shell content-wrap">
      <section className="search-panel" aria-labelledby="search-heading">
        <div className="search-heading-row"><div className="search-symbol"><SearchIcon /></div><div><p className="section-kicker">기업 검색</p><h2 id="search-heading">어떤 기관을 찾으시나요?</h2></div></div>
        <form className="search-form" onSubmit={search} role="search">
          <label htmlFor="organization">기관명</label>
          <div className="input-wrap"><SearchIcon /><input id="organization" value={input} onChange={(e) => setInput(e.target.value)} placeholder="기관명을 입력하세요. 예: 한국" maxLength={100} autoComplete="off" /><button type="submit" disabled={status === "loading"}>{status === "loading" ? "검색 중…" : "검색하기"}</button></div>
          <p className="search-tip"><span aria-hidden="true">i</span> 기관명의 일부만 입력해도 검색할 수 있습니다.</p>
        </form>
      </section>

      <section className="results-section" ref={resultsRef} tabIndex={-1} aria-live="polite">
        {status === "idle" && <div className="state-card"><div className="state-icon"><SearchIcon /></div><h2>기관명을 검색해 보세요</h2><p>채용 분야와 NCS 분류 정보를 확인할 수 있습니다.</p></div>}
        {status === "loading" && <div className="loading-card" role="status"><span className="spinner"/><strong>채용 정보를 찾고 있습니다</strong><p>잠시만 기다려 주세요.</p><div className="skeleton-lines"><i/><i/><i/></div></div>}
        {status === "error" && <div className="state-card error-card" role="alert"><div className="error-symbol">!</div><h2>정보를 불러오지 못했습니다</h2><p>{error}</p><button onClick={() => activeQuery ? void load(activeQuery, pagination.pageNo, pagination.numOfRows) : setStatus("idle")}>다시 시도</button></div>}
        {status === "empty" && <div className="state-card"><div className="state-icon"><SearchIcon /></div><h2>검색 결과가 없습니다</h2><p>‘{activeQuery}’와 일치하는 기관을 찾지 못했습니다.<br />기관명을 줄여서 다시 검색해 보세요.</p></div>}
        {status === "success" && <>
          <div className="results-head"><div><p className="section-kicker">검색 결과</p><h2>‘{activeQuery}’ 관련 기관 <strong>{pagination.totalCount.toLocaleString()}</strong>건</h2></div><label className="rows-select">페이지당 <select value={pagination.numOfRows} onChange={(e) => changeRows(Number(e.target.value))}>{allowedRows.map((value) => <option key={value} value={value}>{value}개</option>)}</select></label></div>
          <div className="table-wrap"><table><caption className="sr-only">기관별 채용 분야 및 NCS 분류 검색 결과</caption><thead><tr><th scope="col">번호</th><th scope="col">기관명</th><th scope="col">채용 분야</th><th scope="col">NCS 분류</th></tr></thead><tbody>{items.map((item, index) => { const no = pagination.totalCount - ((pagination.pageNo - 1) * pagination.numOfRows + index); return <tr key={`${item.orgCoName}-${item.recFieldDetl}-${index}`}><td><span className="number-badge">{no}</span></td><td className="org-name">{item.orgCoName}</td><td><span className="field-pill">{item.recFieldDetl}</span></td><td><Classification value={item.ncsCICdNm} /></td></tr>; })}</tbody></table></div>
          <div className="mobile-results">{items.map((item, index) => <ResultCard key={`${item.orgCoName}-${index}`} item={item} number={pagination.totalCount - ((pagination.pageNo - 1) * pagination.numOfRows + index)} />)}</div>
          {pagination.totalPage > 1 && <nav className="pagination" aria-label="검색 결과 페이지"><button onClick={() => goToPage(1)} disabled={pagination.pageNo === 1} aria-label="첫 페이지">«</button><button onClick={() => goToPage(pagination.pageNo - 1)} disabled={pagination.pageNo === 1} aria-label="이전 페이지">‹</button>{pageNumbers(pagination.pageNo, pagination.totalPage).map((value, index) => value === "ellipsis" ? <span key={`e-${index}`} className="ellipsis">…</span> : <button key={value} onClick={() => goToPage(value)} className={value === pagination.pageNo ? "active" : ""} aria-current={value === pagination.pageNo ? "page" : undefined}>{value}</button>)}<button onClick={() => goToPage(pagination.pageNo + 1)} disabled={pagination.pageNo === pagination.totalPage} aria-label="다음 페이지">›</button><button onClick={() => goToPage(pagination.totalPage)} disabled={pagination.pageNo === pagination.totalPage} aria-label="마지막 페이지">»</button></nav>}
          <p className="page-summary">{pagination.pageNo} / {pagination.totalPage} 페이지</p>
        </>}
      </section>
    </div>
  );
}
