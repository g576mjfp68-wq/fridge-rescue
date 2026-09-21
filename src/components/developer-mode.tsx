"use client";

import type { ApiOperation } from "@/lib/types";

export function DeveloperMode({ operation }: { operation?: ApiOperation }) {
  return (
    <details className="developer-mode">
      <summary>Developer Mode <span>API užklausos informacija</span></summary>
      {operation ? <>
        <p>Paskutinė šio vaizdo užklausa į receptų API. Grįžus išsaugoti rezultatai naujos užklausos neatlieka.</p>
        <dl>
          <div><dt>Sistema</dt><dd>{operation.system}</dd></div>
          <div><dt>Endpoint</dt><dd>{operation.endpoint}</dd></div>
          <div><dt>HTTP metodas</dt><dd>{operation.method}</dd></div>
          <div><dt>HTTP statusas</dt><dd>{operation.status ?? "Atsakymo negauta"}</dd></div>
          <div><dt>Sėkmė</dt><dd>{operation.success ? "Taip" : "Ne"}</dd></div>
          <div><dt>Trukmė</dt><dd>{operation.durationMs} ms</dd></div>
        </dl>
      </> : <p>API užklausos informacijos dar nėra.</p>}
    </details>
  );
}
