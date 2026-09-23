import type { Metadata } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import { AuthDialog } from "@/components/auth-dialog";
import { AvatarDialog } from "@/components/avatar-dialog";
import { DeveloperMode } from "@/components/developer-mode";
import { KitchenDrawer } from "@/components/kitchen-drawer";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const serif = Fraunces({ subsets: ["latin", "latin-ext"], style: ["normal", "italic"], variable: "--font-serif", display: "swap" });
const sans = Source_Sans_3({ subsets: ["latin", "latin-ext"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: "Fridge Rescue – ką gaminti iš to, ką jau turi",
  description: "Receptų paieška pagal kelis produktus lietuviškai, tavo virtuvės produktai ir AI recepto pritaikymas.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="lt" className={`${serif.variable} ${sans.variable}`}>
      <body>
        <a className="skip-link" href="#main">Pereiti prie turinio</a>
        <SiteHeader />
        <main className="shell" id="main">{children}</main>
        <div className="shell"><DeveloperMode /></div>
        <footer className="shell site-footer">
          <span>Fridge Rescue · ruduo ant stalo</span>
          <span>
            Receptai ir nuotraukos: <a href="https://www.themealdb.com/" target="_blank" rel="noreferrer">TheMealDB ↗</a>
            {" · "}Įvado nuotrauka: Anya Chernykh, <a href="https://unsplash.com/photos/yMPAXThkgQI" target="_blank" rel="noreferrer">Unsplash ↗</a>
          </span>
        </footer>
        <KitchenDrawer />
        <AuthDialog />
        <AvatarDialog />
      </body>
    </html>
  );
}
