"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type MouseEvent } from "react";
import { searchPath } from "@/lib/types";
import { openKitchen, showNotice, useUi } from "@/lib/ui-store";
import { AccountMenu } from "./account-menu";
import { BookIcon, LogoMark, PotIcon, SearchIcon, SparkIcon } from "./icons";

const LAST_SEARCH = "fridge-rescue:last-search:v2";

/** "Paieška" returns to the last search of this tab when there is one. */
function lastSearchPath(): string {
  try {
    const cached = JSON.parse(sessionStorage.getItem(LAST_SEARCH) || "null");
    const [mode, ...rest] = String(cached?.key ?? "").split(":");
    const query = rest.join(":");
    if ((mode === "ingredient" || mode === "name") && query) return searchPath(mode, query);
  } catch {
    // Without storage the plain search page is fine.
  }
  return "/";
}

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { kitchenOpen, notice } = useUi();

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => showNotice(""), 4500);
    return () => clearTimeout(timer);
  }, [notice]);

  const onSearchPage = pathname === "/" || pathname.startsWith("/receptai/");
  const onSaved = pathname === "/mano-receptai";
  const onAi = pathname === "/mano-ai-receptai" || pathname.startsWith("/ai-receptai/");

  function goToSearch(event: MouseEvent<HTMLAnchorElement>) {
    if (pathname === "/") return;
    event.preventDefault();
    router.push(lastSearchPath());
  }

  const items = [
    { key: "search", label: "Paieška", short: "Paieška", icon: <SearchIcon />, active: onSearchPage && !kitchenOpen, href: "/", onClick: goToSearch },
    { key: "kitchen", label: "Mano virtuvė", short: "Virtuvė", icon: <PotIcon />, active: kitchenOpen },
    { key: "saved", label: "Mano receptai", short: "Receptai", icon: <BookIcon />, active: onSaved && !kitchenOpen, href: "/mano-receptai" },
    { key: "ai", label: "Mano AI receptai", short: "AI receptai", icon: <SparkIcon />, active: onAi && !kitchenOpen, href: "/mano-ai-receptai" },
  ];

  const renderItem = (item: (typeof items)[number], mobile: boolean) => {
    const content = mobile ? <>{item.icon}<span>{item.short}</span></> : item.label;
    const className = item.active ? "is-active" : undefined;
    return item.href ? (
      <Link key={item.key} href={item.href} onClick={item.onClick} className={className} aria-current={item.active ? "page" : undefined}>
        {content}
      </Link>
    ) : (
      // The kitchen is a drawer, not a page: it keeps the current search in place.
      <button key={item.key} type="button" onClick={openKitchen} className={className} aria-haspopup="dialog" aria-expanded={kitchenOpen}>
        {content}
      </button>
    );
  };

  return (
    <>
      <header className="site-header">
        <div className="shell header-inner">
          <Link className="brand" href="/" aria-label="Fridge Rescue – pradžia">
            <span className="brand-mark"><LogoMark /></span>
            <span className="brand-name">Fridge <em>Rescue</em></span>
          </Link>
          <nav className="main-nav" aria-label="Pagrindinė navigacija">
            {items.map((item) => renderItem(item, false))}
          </nav>
          <AccountMenu />
        </div>
      </header>
      <div className="shell notice-line" role="status" aria-live="polite">
        {notice && <p className="message message--success">{notice}</p>}
      </div>
      <nav className="tab-bar" aria-label="Navigacija telefone">
        {items.map((item) => renderItem(item, true))}
      </nav>
    </>
  );
}
