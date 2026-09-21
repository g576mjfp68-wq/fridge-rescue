import Link from "next/link";

export default function NotFound() {
  return <div className="state-panel"><p className="eyebrow">404</p><h1>Puslapis nerastas</h1><p>Grįžk į paiešką ir atrask, ką gaminti.</p><Link className="secondary-button" href="/">Grįžti į paiešką</Link></div>;
}
