import type { Metadata } from "next";
import { AiRecipesPanel } from "@/components/ai-recipes-panel";

export const metadata: Metadata = { title: "Mano AI receptai – Fridge Rescue" };

export default function AiRecipesPage() {
  return <div className="page"><AiRecipesPanel /></div>;
}
