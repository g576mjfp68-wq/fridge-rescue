"use client";

import { useEffect, useRef, useState } from "react";
import { useKitchenVersion, notifyKitchenChanged } from "@/lib/kitchen-store";
import { getShoppingItems, markBought, removeShoppingItem, type ShoppingItem } from "@/lib/shopping";

/** "Pirkinių sąrašas" inside "Mano virtuvė": missing ingredients to buy. */
export function ShoppingList({ userId, onBought }: { userId: string; onBought: () => void }) {
  const version = useKitchenVersion();
  const [owned, setOwned] = useState<{ userId: string; items: ShoppingItem[] } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const pending = useRef(false);
  const items = owned?.userId === userId ? owned.items : null;

  useEffect(() => {
    let active = true;
    getShoppingItems(userId)
      .then((data) => { if (active) setOwned({ userId, items: data }); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Pirkinių sąrašo gauti nepavyko."); });
    return () => { active = false; };
  }, [userId, version]);

  async function run(item: ShoppingItem, action: "bought" | "remove") {
    if (pending.current) return;
    pending.current = true;
    setBusyId(item.id);
    setError("");
    setNotice("");
    try {
      if (action === "bought") {
        await markBought(item, userId);
        setNotice(`„${item.name}“ perkelta į Mano virtuvę.`);
        onBought();
      } else {
        await removeShoppingItem(item.id, userId);
        notifyKitchenChanged();
      }
      setOwned((current) => current && { ...current, items: current.items.filter((entry) => entry.id !== item.id) });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Veiksmas nepavyko.");
    } finally {
      pending.current = false;
      setBusyId(null);
    }
  }

  async function copy() {
    if (!items?.length) return;
    try {
      await navigator.clipboard.writeText(items.map((item) => `• ${item.name}`).join("\n"));
      setNotice("Pirkinių sąrašas nukopijuotas.");
    } catch {
      setError("Nukopijuoti nepavyko – pažymėkite sąrašą ir kopijuokite rankiniu būdu.");
    }
  }

  return (
    <section className="shopping" aria-labelledby="shopping-title">
      <div className="kitchen-list-head">
        <h3 id="shopping-title">Pirkinių sąrašas</h3>
        {items && items.length > 0 && <button type="button" className="link-button" onClick={copy}>Kopijuoti</button>}
      </div>
      {notice && <p className="message message--success" role="status">{notice}</p>}
      {error && <p className="message message--error" role="alert">{error}</p>}
      {items === null && !error ? (
        <p className="kitchen-hint" role="status">Kraunamas pirkinių sąrašas…</p>
      ) : !items?.length ? (
        <p className="kitchen-hint">Sąrašas tuščias. Recepto puslapyje spausk „Įdėti trūkstamus į pirkinių sąrašą“.</p>
      ) : (
        <ul className="shopping-list" aria-label="Pirkiniai">
          {items.map((item) => (
            <li key={item.id}>
              <span>
                {item.name}
                {item.recipe_name && <small>{item.recipe_name}</small>}
              </span>
              <button type="button" className="btn btn-soft btn-small" disabled={busyId === item.id} onClick={() => void run(item, "bought")} aria-label={`Nupirkau: ${item.name}`}>
                ✓ Nupirkau
              </button>
              <button type="button" className="shopping-remove" disabled={busyId === item.id} onClick={() => void run(item, "remove")} aria-label={`Pašalinti iš pirkinių: ${item.name}`}>×</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
