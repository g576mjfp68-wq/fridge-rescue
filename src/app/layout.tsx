import type { Metadata } from "next";
import Link from "next/link";
import { DeveloperMode } from "@/components/developer-mode";
import { FridgeIcon, LeafIcon } from "@/components/icons";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fridge Rescue – atrask, ką gaminti",
  description: "Atrask, ką gaminti iš turimų produktų. Receptų paieška pagal ingredientą arba patiekalo pavadinimą.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="lt"><body>
    <a className="skip-link" href="#main">Pereiti prie turinio</a>
    <header className="site-header"><div className="shell header-inner"><Link className="brand" href="/" aria-label="Fridge Rescue – pradžia"><span className="brand-icon"><FridgeIcon /></span><span>fridge<span className="brand-serif">rescue</span><span className="sr-only"> – Fridge Rescue</span></span></Link><p><LeafIcon /> Mažiau švaistymo. Daugiau skonio.</p></div></header>
    <main className="shell" id="main">{children}</main>
    <div className="shell"><DeveloperMode /></div>
    <footer className="shell site-footer"><span>Fridge Rescue <span aria-hidden="true">·</span> Geri dalykai prasideda šaldytuve.</span><a href="https://www.themealdb.com/" target="_blank" rel="noreferrer">Receptai ir nuotraukos: TheMealDB <span aria-hidden="true">↗</span></a></footer>
  </body></html>;
}
