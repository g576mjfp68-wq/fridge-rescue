import { Suspense } from "react";
import { SearchExperience } from "@/components/search-experience";

export default function Home() {
  return <Suspense fallback={<div className="detail-loading" role="status">Kraunama paieška…</div>}><SearchExperience /></Suspense>;
}
