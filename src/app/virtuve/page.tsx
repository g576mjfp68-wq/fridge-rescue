import type { Metadata } from "next";
import { KitchenPanel } from "@/components/kitchen-panel";

export const metadata: Metadata = { title: "Mano virtuvė – Fridge Rescue" };

/** Direct link; the header opens the same panel as a drawer over the current page. */
export default function KitchenPage() {
  return <div className="page page--narrow"><KitchenPanel /></div>;
}
