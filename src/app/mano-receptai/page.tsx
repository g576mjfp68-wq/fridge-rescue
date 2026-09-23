import type { Metadata } from "next";
import { SavedRecipesPanel } from "@/components/saved-recipes-panel";

export const metadata: Metadata = { title: "Mano receptai – Fridge Rescue" };

export default function SavedRecipesPage() {
  return <div className="page"><SavedRecipesPanel /></div>;
}
