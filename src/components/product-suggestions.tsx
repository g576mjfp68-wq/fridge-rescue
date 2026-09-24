"use client";

import { splitProducts, suggestProducts } from "@/lib/ingredients-lt";

/**
 * Suggestions for the product being typed (the text after the last comma).
 * Picking one replaces that part and adds ", " so the next product can follow.
 */
export function ProductSuggestions({ value, onPick, disabled }: {
  value: string;
  onPick: (value: string) => void;
  disabled?: boolean;
}) {
  const cut = Math.max(value.lastIndexOf(","), value.lastIndexOf(";"));
  const typed = value.slice(cut + 1).trim();
  const before = splitProducts(value.slice(0, cut + 1));
  const suggestions = suggestProducts(typed, 5, before).filter((name) => name !== typed);
  if (disabled || !suggestions.length) return null;

  return (
    <div className="suggestions" role="group" aria-label="Produktų pasiūlymai">
      <span aria-hidden="true">Gal:</span>
      {suggestions.map((name) => (
        <button
          key={name}
          type="button"
          onClick={() => onPick(`${value.slice(0, cut + 1)}${cut >= 0 ? " " : ""}${name}, `)}
        >
          {name}
        </button>
      ))}
    </div>
  );
}
