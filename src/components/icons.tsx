import type { SVGProps } from "react";

export function FridgeIcon(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 28" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" {...props}><rect x="4" y="2" width="16" height="23" rx="3" /><path d="M4 11h16M8 6v2M8 15v4M7 25v2M17 25v2" /></svg>;
}

export function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...props}><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg>;
}

export function ArrowIcon(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true" {...props}><path d="M4 12h15m-6-6 6 6-6 6" /></svg>;
}

export function LeafIcon(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true" {...props}><path d="M7 25C-1 10 15 5 27 5c0 14-5 24-17 20M5 29 21 12M11 22l-1-8m5 4 7 1" /></svg>;
}

const line = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

/** Logo: fridge outline with a small autumn leaf. */
export function LogoMark(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}><rect x="6" y="5" width="12" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.6" /><path d="M6 11h12M9 8v1.5M9 14v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><path d="M12 5c0-2 1.5-3.2 3.6-3.2 0 2-1.4 3.2-3.6 3.2z" fill="var(--terra)" /></svg>;
}

export function ChevronIcon(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" {...line} strokeWidth={2} {...props}><path d="m6 9 6 6 6-6" /></svg>;
}

export function PotIcon(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" {...line} {...props}><path d="M4 10h16v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM2 10h20M9 6c0-1 1-1 1-2M14 6c0-1 1-1 1-2" /></svg>;
}

export function BookIcon(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" {...line} {...props}><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11" /></svg>;
}

export function SparkIcon(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" {...line} {...props}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" /></svg>;
}

export function FaceIcon(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" {...line} {...props}><circle cx="12" cy="12" r="9" /><path d="M8.5 14.5c1 1.2 2.2 1.8 3.5 1.8s2.5-.6 3.5-1.8M9 9.5h.01M15 9.5h.01" /></svg>;
}

export function LogoutIcon(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" {...line} {...props}><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3" /></svg>;
}

export function HeartIcon({ filled, ...props }: SVGProps<SVGSVGElement> & { filled?: boolean }) {
  return <svg viewBox="0 0 24 24" {...line} fill={filled ? "currentColor" : "none"} {...props}><path d="M12 20s-7-4.4-9-8.6C1.6 8.3 3.5 5 6.8 5c2 0 3.3 1.1 4.2 2.4C11.9 6.1 13.2 5 15.2 5c3.3 0 5.2 3.3 3.8 6.4C19 15.6 12 20 12 20z" /></svg>;
}

export function DiceIcon(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" {...line} {...props}><rect x="3.5" y="3.5" width="17" height="17" rx="3.5" /><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" /><circle cx="15.5" cy="15.5" r="1.2" fill="currentColor" /><circle cx="12" cy="12" r="1.2" fill="currentColor" /><circle cx="15.5" cy="8.5" r="1.2" fill="currentColor" /><circle cx="8.5" cy="15.5" r="1.2" fill="currentColor" /></svg>;
}
