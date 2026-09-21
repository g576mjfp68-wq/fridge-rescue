import { Suspense } from "react";
import { RecipeDetail } from "@/components/recipe-detail";

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Suspense fallback={<div className="detail-loading" role="status">Kraunamas receptas…</div>}><RecipeDetail id={id} /></Suspense>;
}
