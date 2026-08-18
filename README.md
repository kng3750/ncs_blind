# 블라인드 채용 기업별 분류 조회

한국산업인력공단 공공데이터 API에서 기관별 채용 분야와 NCS 분류를 조회하는 Next.js 웹 애플리케이션입니다. 브라우저는 앱의 `/api/organizations`만 호출하며 공공데이터 인증키는 서버에서만 사용합니다.

## 설치 및 실행

Node.js 20.9 이상이 필요합니다.

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

`.env.local`에 공공데이터포털 인증키를 입력합니다.

```env
DATA_GO_KR_SERVICE_KEY=발급받은_인증키
```

브라우저에서 `http://localhost:3000`을 엽니다.

## 인증키 주의사항

- 인증키는 `.env.local`에만 저장하고 Git에 커밋하지 마세요.
- 공공데이터포털이 제공하는 일반(Decoding) 키와 인코딩(Encoding) 키를 모두 처리하도록 서버에서 `%xx` 형식의 키를 한 번만 디코딩한 뒤 요청 URL에 넣습니다.
- 키 앞뒤에 따옴표나 불필요한 공백을 넣지 마세요.
- `NEXT_PUBLIC_` 접두사가 붙은 환경변수에는 인증키를 넣지 마세요. 브라우저 번들에 포함될 수 있습니다.

## 명령어

```bash
npm run dev
npm test
npm run lint
npm run build
npm start
```

## 오류 점검

- “인증키가 설정되지 않았습니다”: `.env.local` 파일과 변수명을 확인하고 개발 서버를 다시 시작합니다.
- 인증 오류: 공공데이터포털에서 해당 API 활용 신청 상태와 키 종류를 확인합니다.
- 연결/시간 초과: 공공데이터 서비스 상태와 네트워크를 확인합니다.
- 결과 없음: 전체 기관명 대신 기관명의 일부로 검색해 봅니다.

외부 API는 HTTP 주소를 사용하지만 브라우저가 직접 접근하지 않습니다. Next.js 서버 Route Handler가 대신 요청하므로 HTTPS 배포 환경에서도 인증키 노출과 브라우저 혼합 콘텐츠 문제를 방지합니다.
