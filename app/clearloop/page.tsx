import type { Metadata } from "next";
import { ClearLoopApp } from "@/components/clearloop-app";

export const metadata: Metadata = {
  title: "ClearLoop — Traceable Operations Records",
  description: "把零散、矛盾的工作訊息整理成清晰、可追蹤、可執行的紀錄。",
};

export default function ClearLoopPage() {
  return <ClearLoopApp />;
}
