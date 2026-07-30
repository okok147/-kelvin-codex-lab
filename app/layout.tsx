import type { Metadata } from "next";
import { sitePath } from "@/lib/site-path";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kelvin Lau — Systems & UI Portfolio",
  description: "把零散訊息轉化成可以追蹤、執行與交接的系統：Kelvin Lau 的 ClearLoop、工作流與 UI/UX 作品集。",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: sitePath("/favicon.svg"),
    shortcut: sitePath("/favicon.svg"),
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body className="antialiased">{children}</body>
    </html>
  );
}
