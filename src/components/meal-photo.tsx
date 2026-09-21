"use client";

import Image from "next/image";
import { useState } from "react";

export function MealPhoto({ src, name, priority = false, sizes }: { src: string | null; name: string; priority?: boolean; sizes: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <div className="photo-fallback">Nuotrauka nepasiekiama</div>;
  return <Image src={src} alt={name} fill sizes={sizes} priority={priority} unoptimized onError={() => setFailed(true)} />;
}
