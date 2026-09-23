"use client";

import { setDevModeEnabled, useDevMode } from "@/lib/dev-mode";
import type { ApiOperation } from "@/lib/types";

function Details({ operation }: { operation: ApiOperation }) {
  return (
    <dl>
      <div><dt>Sistema</dt><dd>{operation.system}</dd></div>
      <div><dt>Endpoint</dt><dd>{operation.endpoint}</dd></div>
      <div><dt>HTTP metodas</dt><dd>{operation.method}</dd></div>
      <div><dt>HTTP statusas</dt><dd>{operation.status ?? "Atsakymo negauta"}</dd></div>
      <div><dt>Sėkmė</dt><dd>{operation.success ? "Taip" : "Ne"}</dd></div>
      <div><dt>Trukmė</dt><dd>~{operation.durationMs} ms</dd></div>
      {operation.path && <div><dt>Kelias</dt><dd>{operation.path}</dd></div>}
    </dl>
  );
}

/** Global switch; shows the latest TheMealDB, Gemini or Supabase call made by this page. */
export function DeveloperMode() {
  const { enabled, operations } = useDevMode();
  const last = operations.at(-1);
  const earlier = operations.slice(0, -1).reverse();

  return (
    <section className="developer-mode" aria-label="Developer Mode">
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        className="developer-switch"
        onClick={() => setDevModeEnabled(!enabled)}
      >
        <span className="developer-switch-track" aria-hidden="true"><span /></span>
        Developer Mode
      </button>

      {enabled && (
        <div className="developer-panel">
          {last ? <>
            <p>Paskutinė API operacija. Statusas – tikras išorinės paslaugos atsakymas; raktai, slaptažodžiai ir užklausų turinys nerodomi.</p>
            <Details operation={last} />
            {earlier.length > 0 && (
              <details>
                <summary>Ankstesnės operacijos ({earlier.length})</summary>
                <ol>
                  {earlier.map((operation, index) => (
                    <li key={index}>
                      {operation.system} · {operation.method} {operation.endpoint} · {operation.status ?? "—"} · {operation.success ? "sėkmė" : "klaida"} · ~{operation.durationMs} ms
                    </li>
                  ))}
                </ol>
              </details>
            )}
          </> : <p>API operacijų dar nebuvo. Atlik paiešką, atidaryk receptą arba išsaugok įrašą.</p>}
        </div>
      )}
    </section>
  );
}
