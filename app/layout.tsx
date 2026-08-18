import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "블라인드 채용 기업별 분류 조회",
  description: "기관별 채용 분야와 NCS 분류 정보를 확인하세요.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
