import { Suspense } from "react";
import SearchExperience from "@/components/search-experience";

function PageFallback() {
  return <div className="page-loading" role="status">검색 서비스를 준비하고 있습니다.</div>;
}

export default function Home() {
  return (
    <main>
      <header className="hero">
        <div className="shell hero-inner">
          <div className="brand-row">
            <span className="brand-mark" aria-hidden="true">N</span>
            <span>능력중심 채용정보</span>
          </div>
          <div className="hero-copy">
            <p className="eyebrow">NCS · 블라인드 채용</p>
            <h1>기업별 채용 분류를<br /><span>한눈에 확인하세요.</span></h1>
            <p className="hero-description">기관명을 검색하면 채용 분야와 연결된 국가직무능력표준(NCS) 분류를 쉽고 빠르게 찾아볼 수 있습니다.</p>
          </div>
        </div>
      </header>
      <Suspense fallback={<PageFallback />}>
        <SearchExperience />
      </Suspense>
      <footer>
        <div className="shell footer-inner">
          <p>한국산업인력공단 공공데이터를 활용한 정보조회 서비스</p>
          <p>본 서비스의 정보는 공공데이터포털 제공 자료를 기반으로 합니다.</p>
        </div>
      </footer>
    </main>
  );
}
