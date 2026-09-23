"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { addKitchenItems, getKitchenItems, removeKitchenItem, type KitchenItem } from "@/lib/kitchen";
import { MAX_PRODUCT_LENGTH, MAX_PRODUCTS, splitProducts, translateProduct } from "@/lib/ingredients-lt";
import { useAiUser } from "@/lib/supabase/use-ai-user";
import { searchPath } from "@/lib/types";

export function KitchenPanel() {
  const id = useId();
  const { loading: userLoading, userId } = useAiUser();
  // Tagged with the owner so another user's list is never shown after switching accounts.
  const [owned, setOwned] = useState<{ userId: string | null; items: KitchenItem[] }>({ userId: null, items: [] });
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const pending = useRef(false);
  const items = userId && owned.userId === userId ? owned.items : [];
  const loading = Boolean(userId) && loadedFor !== userId && !error;

  useEffect(() => {
    if (userLoading || !userId) return;
    const ownerId = userId;
    let active = true;
    getKitchenItems(ownerId)
      .then((data) => { if (active) setOwned({ userId: ownerId, items: data }); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Nepavyko gauti produktų."); })
      .finally(() => { if (active) setLoadedFor(ownerId); });
    return () => { active = false; };
  }, [userId, userLoading]);

  async function add(event: FormEvent) {
    event.preventDefault();
    if (!userId || pending.current) return;
    const names = splitProducts(draft);
    if (!names.length) { setError("Įveskite bent vieną produktą, pvz., kiaušiniai, pomidorai, sūris."); return; }
    const tooLong = names.filter((name) => name.length > MAX_PRODUCT_LENGTH);
    if (tooLong.length) { setError(`Per ilgas produkto pavadinimas (iki ${MAX_PRODUCT_LENGTH} simbolių): ${tooLong.join(", ")}.`); return; }
    pending.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await addKitchenItems(draft, items, userId);
      if (result.added.length) {
        setOwned((current) => ({ userId, items: [...(current.userId === userId ? current.items : []), ...result.added] }));
      }
      const parts = [];
      if (result.added.length) parts.push(`Pridėta: ${result.added.map((item) => item.name).join(", ")}.`);
      if (result.duplicates.length) parts.push(`Jau buvo sąraše: ${result.duplicates.join(", ")}.`);
      setNotice(parts.join(" "));
      if (result.failed.length) {
        setError(`Nepavyko išsaugoti: ${result.failed.map((item) => `${item.name} (${item.reason})`).join("; ")}.`);
        // Keep only the failed products in the field so they can be retried.
        setDraft(result.failed.map((item) => item.name).join(", "));
      } else {
        setDraft("");
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Produktų pridėti nepavyko.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  async function remove(item: KitchenItem) {
    if (!userId || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await removeKitchenItem(item.id, userId);
      setOwned((current) => ({ ...current, items: current.items.filter((entry) => entry.id !== item.id) }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Produkto pašalinti nepavyko.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  const searchable = items.filter((item) => translateProduct(item.name) || /^[a-z][a-z '-]*$/i.test(item.name)).slice(0, MAX_PRODUCTS);

  return (
    <section id="mano-virtuve" className="results-section kitchen-section" aria-labelledby={`${id}-heading`}>
      <div className="section-heading">
        <h2 id={`${id}-heading`}>Mano virtuvė</h2>
        <span>{userId ? `${items.length} produktų` : "Tavo turimi produktai"}</span>
      </div>

      {userLoading ? (
        <p role="status">Tikrinama prisijungimo būsena…</p>
      ) : !userId ? (
        <p className="kitchen-guest">Prisijunk, kad galėtum išsaugoti turimus produktus ir naudoti juos AI recepto pritaikymui.</p>
      ) : (
        <>
          <form className="kitchen-form" onSubmit={add} noValidate>
            <label htmlFor={`${id}-input`}>Pridėk turimus produktus</label>
            <div>
              <input
                id={`${id}-input`}
                value={draft}
                onChange={(event) => { setDraft(event.target.value); setError(""); setNotice(""); }}
                maxLength={300}
                placeholder="Pvz., kiaušiniai, pomidorai, sūris"
                aria-describedby={`${id}-hint`}
                autoComplete="off"
                disabled={busy || loading}
              />
              <button type="submit" className="secondary-button" disabled={busy || loading}>
                {busy ? "Saugoma…" : "Pridėti"}
              </button>
            </div>
            <p className="kitchen-hint" id={`${id}-hint`}>Kelis produktus atskirk kableliais – kiekvienas bus išsaugotas atskirai.</p>
          </form>

          {notice && <p className="auth-message auth-message--success" role="status">{notice}</p>}
          {error && <p className="auth-message auth-message--error" role="alert">{error}</p>}

          {loading ? (
            <p role="status">Kraunami produktai…</p>
          ) : items.length === 0 ? (
            <p className="kitchen-empty">Virtuvė tuščia. Pridėk produktus, pvz., kiaušiniai, ryžiai, pomidorai, sūris.</p>
          ) : (
            <>
              <ul className="kitchen-list" aria-label="Mano produktai">
                {items.map((item) => (
                  <li key={item.id}>
                    <span>{item.name}</span>
                    <button type="button" onClick={() => remove(item)} disabled={busy} aria-label={`Pašalinti ${item.name}`}>×</button>
                  </li>
                ))}
              </ul>
              {searchable.length > 0 && (
                <Link className="kitchen-search" href={searchPath("ingredient", searchable.map((item) => item.name).join(", "))}>
                  Ieškoti receptų iš virtuvės ({searchable.length}) →
                </Link>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
