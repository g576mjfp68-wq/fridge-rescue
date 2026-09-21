"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <div className="state-panel error-panel" role="alert"><h1>Nepavyko parodyti puslapio</h1><p>Įvyko netikėta klaida. Bandyk dar kartą.</p><button className="secondary-button" onClick={reset}>Bandyti dar kartą</button></div>;
}
