"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { addKitchenItems, getKitchenItems, removeKitchenItem, type KitchenItem } from "@/lib/kitchen";
import { MAX_PRODUCT_LENGTH, MAX_PRODUCTS, splitProducts } from "@/lib/ingredients-lt";
import { useAiUser } from "@/lib/supabase/use-ai-user";
import { searchPath } from "@/lib/types";
import { openAuth } from "@/lib/ui-store";
import { notifyKitchenChanged } from "@/lib/kitchen-store";
import { ProductSuggestions } from "./product-suggestions";
import { ShoppingList } from "./shopping-list";

export function KitchenPanel({ titleId, onSearch }: { titleId?: string; onSearch?: () => void } = {}) {
  const generated = useId();
  const id = titleId ?? generated;
  const { loading: userLoading, userId } = useAiUser();
  // Tagged with the owner so another user's list is never shown after switching accounts.
  const [owned, setOwned] = useState<{ userId: string | null; items: KitchenItem[] }>({ userId: null, items: [] });
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const pending = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  // Products picked for "Ieškoti pagal pasirinktus produktus" (item IDs, max 5).
  const [picked, setPicked] = useState<string[]>([]);
  const items = userId && owned.userId === userId ? owned.items : [];
  const selected = items.filter((item) => picked.includes(item.id));
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
        notifyKitchenChanged();
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
      setPicked((current) => current.filter((id) => id !== item.id));
      notifyKitchenChanged();
      setOwned((current) => ({ ...current, items: current.items.filter((entry) => entry.id !== item.id) }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Produkto pašalinti nepavyko.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  /** After "Nupirkau" the product is in the kitchen: show it here too. */
  async function reloadKitchen() {
    if (!userId) return;
    try {
      setOwned({ userId, items: await getKitchenItems(userId) });
    } catch {
      // The list refreshes on the next open.
    }
    notifyKitchenChanged();
  }

  function togglePick(item: KitchenItem) {
    setPicked((current) => current.includes(item.id)
      ? current.filter((id) => id !== item.id)
      : current.length < MAX_PRODUCTS ? [...current, item.id] : current);
  }

  /** Ingredient search with only the picked products; category/area filters are cleared. */
  function searchPicked() {
    if (!selected.length) return;
    onSearch?.();
    router.push(searchPath("ingredient", selected.map((item) => item.name).join(", ")));
  }

  return (
    <section className="kitchen-section" aria-labelledby={id}>
      <p className="eyebrow">Mano virtuvė</p>
      <div className="section-heading">
        <h2 id={id}>Mano virtuvė</h2>
        <span>{userId ? `${items.length} produktų` : "Tavo turimi produktai"}</span>
      </div>
      <p className="kitchen-intro">Ką turi namie? Produktai išsaugomi tavo paskyroje. Paieškos laukelis virtuvės nepildo – receptų ieškok pasirinkęs produktus žemiau.</p>

      {userLoading ? (
        <p role="status">Tikrinama prisijungimo būsena…</p>
      ) : !userId ? (
        <div className="kitchen-guest">
          <p>Prisijunk, kad galėtum išsaugoti turimus produktus ir naudoti juos AI recepto pritaikymui.</p>
          <button type="button" className="btn btn-primary" onClick={() => openAuth("login")}>Prisijungti</button>
        </div>
      ) : (
        <>
          <form className="kitchen-form" onSubmit={add} noValidate>
            <label htmlFor={`${id}-input`}>Pridėk turimus produktus</label>
            <div>
              <input
                ref={inputRef}
                id={`${id}-input`}
                value={draft}
                onChange={(event) => { setDraft(event.target.value); setError(""); setNotice(""); }}
                maxLength={300}
                placeholder="Pvz., kiaušiniai, pomidorai, sūris"
                aria-describedby={`${id}-hint`}
                autoComplete="off"
                disabled={busy || loading}
              />
              <button type="submit" className="btn btn-soft" disabled={busy || loading}>
                {busy ? "Saugoma…" : "Pridėti į virtuvę"}
              </button>
            </div>
            <ProductSuggestions
              value={draft}
              disabled={busy || loading}
              onPick={(value) => { setDraft(value); setError(""); setNotice(""); inputRef.current?.focus(); }}
            />
            <p className="kitchen-hint" id={`${id}-hint`}>Kelis produktus atskirk kableliais – kiekvienas bus išsaugotas atskirai.</p>
          </form>

          {notice && <p className="message message--success" role="status">{notice}</p>}
          {error && <p className="message message--error" role="alert">{error}</p>}

          {loading ? (
            <p role="status">Kraunami produktai…</p>
          ) : items.length === 0 ? (
            <p className="kitchen-empty">Virtuvė tuščia. Pridėk produktus, pvz., kiaušiniai, ryžiai, pomidorai, sūris.</p>
          ) : (
            <>
              <div className="kitchen-list-head">
                <h3 id={`${id}-list`}>Tavo išsaugotas produktų sąrašas</h3>
                <span aria-live="polite">Pasirinkta {selected.length} iš {MAX_PRODUCTS}</span>
              </div>
              <p className="kitchen-hint">Pažymėk iki {MAX_PRODUCTS} produktų, pagal kuriuos ieškosime receptų.</p>
              <ul className="kitchen-list" aria-label="Mano produktai">
                {items.map((item) => {
                  const isPicked = picked.includes(item.id);
                  return (
                    <li key={item.id} className={isPicked ? "is-picked" : ""}>
                      <label>
                        <input
                          type="checkbox"
                          checked={isPicked}
                          disabled={!isPicked && selected.length >= MAX_PRODUCTS}
                          onChange={() => togglePick(item)}
                        />
                        <span>{item.name}</span>
                      </label>
                      <button type="button" onClick={() => remove(item)} disabled={busy} aria-label={`Pašalinti ${item.name}`}>×</button>
                    </li>
                  );
                })}
              </ul>
              <button type="button" className="btn btn-terra btn-block kitchen-search" onClick={searchPicked} disabled={!selected.length}>
                Ieškoti pagal pasirinktus produktus{selected.length ? ` (${selected.length})` : ""} →
              </button>
              <p className="kitchen-hint">Kategorijos ir pasaulio virtuvės filtrai bus išvalyti.</p>
            </>
          )}

          <ShoppingList userId={userId} onBought={reloadKitchen} />
        </>
      )}
    </section>
  );
}
