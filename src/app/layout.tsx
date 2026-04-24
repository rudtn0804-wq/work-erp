import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "인테리어 현장관리",
  description: "일정, 작업일지, 출근, 급여정산을 위한 현장형 웹앱 MVP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
