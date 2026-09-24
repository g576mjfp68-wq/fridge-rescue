/**
 * Lithuanian product names mapped to exact TheMealDB ingredient names.
 * filter.php only matches exact names ("Potatoes" works, "Potato" does not),
 * so every English value here was checked against list.php?i=list.
 */
type Entry = { stems?: string[]; phrases?: string[]; en: string[] };

// Stems and phrases are written without diacritics; input is normalized the same way.
const ENTRIES: Entry[] = [
  { stems: ["vistien", "vist"], en: ["Chicken", "Chicken Breast", "Chicken Thighs"] },
  { phrases: ["vistienos krutinele", "vistienos krutineles", "krutinele"], en: ["Chicken Breast", "Chicken Breasts"] },
  { stems: ["sparnel"], phrases: ["vistienos sparneliai", "vistienos sparnelius"], en: ["Chicken Wings"] },
  { stems: ["kepenel"], phrases: ["vistienos kepeneles", "vistienos kepenele"], en: ["Chicken Liver"] },
  { stems: ["jautien"], en: ["Beef", "Minced Beef"] },
  { stems: ["kiaulien"], en: ["Pork", "Minced Pork"] },
  { stems: ["erien"], en: ["Lamb", "Lamb Mince"] },
  { stems: ["kalakut"], en: ["Turkey", "Turkey Mince"] },
  { stems: ["antien", "antis"], en: ["Duck", "Duck Legs"] },
  { stems: ["fars"], phrases: ["malta mesa", "maltos mesos", "malta jautiena"], en: ["Minced Beef", "Minced Pork", "Ground Beef"] },
  { stems: ["sonin"], en: ["Bacon"] },
  { stems: ["kump"], en: ["Ham"] },
  { stems: ["desr"], en: ["Sausages"] },
  { stems: ["lasis", "lasisa"], en: ["Salmon"] },
  { stems: ["tun"], en: ["Tuna"] },
  { stems: ["menk"], en: ["Cod"] },
  { stems: ["silk"], en: ["Herring"] },
  { stems: ["upetak"], en: ["Trout"] },
  { stems: ["skumbr"], en: ["Mackerel"] },
  { stems: ["krevet"], en: ["Prawns", "Shrimp"] },
  { stems: ["kalmar"], en: ["Squid"] },
  { stems: ["zuv"], en: ["Fish fillet"] },
  { stems: ["kiaus"], en: ["Eggs", "Egg"] },
  { stems: ["ryz"], en: ["Rice"] },
  { stems: ["makaron"], en: ["Spaghetti", "Penne Rigate", "Macaroni"] },
  { stems: ["spaget", "spagec"], en: ["Spaghetti"] },
  { stems: ["laksti"], en: ["Noodles", "Egg Noodles"] },
  { stems: ["bulv"], en: ["Potatoes"] },
  { phrases: ["saldziosios bulves", "saldzios bulves", "batatai", "batatas"], en: ["Sweet Potatoes"] },
  { stems: ["pomidor"], en: ["Tomatoes", "Cherry Tomatoes", "Tomato"] },
  { stems: ["svogun"], en: ["Onions", "Onion"] },
  { stems: ["cesnak"], en: ["Garlic", "Garlic Clove"] },
  { stems: ["mork"], en: ["Carrots"] },
  { stems: ["kopust"], en: ["Cabbage"] },
  { phrases: ["lapiniai kopustai", "lapinis kopustas"], en: ["Kale"] },
  { stems: ["gryb", "pievagryb"], en: ["Mushrooms"] },
  { stems: ["paprik"], en: ["Red Pepper", "Green Pepper", "Yellow Pepper"] },
  { stems: ["sur"], en: ["Cheese", "Cheddar Cheese", "Parmesan"] },
  { phrases: ["kietasis suris", "fermentinis suris"], en: ["Cheddar Cheese", "Parmesan"] },
  { stems: ["mocarel"], en: ["Mozzarella"] },
  { stems: ["fet"], en: ["Feta"] },
  { stems: ["parmezan"], en: ["Parmesan"] },
  { stems: ["varsk"], en: ["Cottage Cheese", "Ricotta"] },
  { phrases: ["kreminis suris", "grietineles suris"], en: ["Cream Cheese"] },
  { stems: ["pien"], en: ["Milk"] },
  { stems: ["sviest"], en: ["Butter"] },
  { stems: ["grietinel"], en: ["Double Cream", "Heavy Cream", "Cream"] },
  { stems: ["grietin"], en: ["Sour Cream"] },
  { stems: ["jogurt"], en: ["Yogurt"] },
  { stems: ["milt"], en: ["Flour"] },
  { stems: ["cukr"], en: ["Sugar"] },
  { stems: ["duon"], en: ["Bread"] },
  { stems: ["obuol"], en: ["Apples"] },
  { stems: ["citrin"], en: ["Lemon", "Lemons"] },
  { stems: ["laim"], en: ["Lime"] },
  { stems: ["banan"], en: ["Banana"] },
  { stems: ["spinat"], en: ["Spinach"] },
  { stems: ["brokol"], en: ["Broccoli"] },
  { stems: ["agurk"], en: ["Cucumber"] },
  { stems: ["cukinij"], en: ["Zucchini", "Courgettes"] },
  { stems: ["baklazan"], en: ["Aubergine"] },
  { stems: ["burok"], en: ["Beetroot"] },
  { stems: ["pupel", "pupos"], en: ["Kidney Beans", "Butter Beans", "Green Beans"] },
  { stems: ["lesi"], en: ["Lentils"] },
  { stems: ["avinzirn"], en: ["Chickpeas"] },
  { stems: ["zirn"], en: ["Peas"] },
  { stems: ["kukuruz"], en: ["Sweetcorn"] },
  { stems: ["aviz"], en: ["Oats"] },
  { stems: ["medu", "medau"], en: ["Honey"] },
  { stems: ["sokolad"], en: ["Dark Chocolate", "Milk Chocolate"] },
  { stems: ["aliej"], en: ["Oil", "Sunflower Oil"] },
  { phrases: ["alyvuogiu aliejus", "alyvuogiu aliejaus"], en: ["Olive Oil", "Extra Virgin Olive Oil"] },
  { stems: ["alyvuog"], en: ["Black Olives", "Green Olives"] },
  { stems: ["bazilik"], en: ["Basil", "Basil Leaves"] },
  { stems: ["petrazol"], en: ["Parsley"] },
  { stems: ["krap"], en: ["Dill"] },
  { stems: ["ciobrel"], en: ["Thyme"] },
  { stems: ["raudonel"], en: ["Oregano"] },
  { stems: ["bras"], en: ["Strawberries"] },
  { stems: ["apelsin"], en: ["Orange"] },
  { stems: ["kriaus"], en: ["Pears"] },
  { stems: ["avokad"], en: ["Avocado"] },
  { stems: ["poras", "porai", "poro", "poru"], en: ["Leek"] },
  { stems: ["saler", "salier"], en: ["Celery"] },
  { stems: ["moliug"], en: ["Pumpkin", "Butternut Squash"] },
  { stems: ["grik"], en: ["Buckwheat"] },
  { phrases: ["manu kruopos", "manai"], en: ["Semolina"] },
  { phrases: ["graikiniai riesutai", "graikiniu riesutu"], en: ["Walnuts"] },
  { phrases: ["zemes riesutai", "zemes riesutu"], en: ["Peanuts"] },
  { stems: ["migdol"], en: ["Almonds"] },
  { stems: ["razin"], en: ["Raisins"] },
  { stems: ["vysn"], en: ["Cherry"] },
  { stems: ["aviet"], en: ["Raspberries"] },
  { stems: ["melyn"], en: ["Blueberries"] },
  { stems: ["imbier"], en: ["Ginger"] },
  { stems: ["cinamon"], en: ["Cinnamon"] },
  { stems: ["act"], en: ["Vinegar"] },
  { phrases: ["soju padazas", "soju padazo"], en: ["Soy Sauce"] },
  { stems: ["kecup"], en: ["Tomato Ketchup"] },
  { stems: ["majonez"], en: ["Mayonnaise"] },
  { stems: ["garstyc"], en: ["Mustard"] },
  { stems: ["anana"], en: ["Pineapple Chunks"] },
  { stems: ["kokos"], en: ["Coconut", "Coconut Milk"] },
  { stems: ["mieles", "mieliu"], en: ["Yeast"] },
];

export function normalizeProduct(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Returns the TheMealDB ingredient names for a Lithuanian product, or null if unknown. */
export function translateProduct(value: string): string[] | null {
  const input = normalizeProduct(value);
  if (!input) return null;

  const phrase = ENTRIES.find((entry) => entry.phrases?.includes(input));
  if (phrase) return phrase.en;

  // Longest stem wins, so "grietinele" (cream) beats "grietine" (sour cream).
  let best: { length: number; en: string[] } | null = null;
  for (const entry of ENTRIES) {
    for (const stem of entry.stems ?? []) {
      const rest = input.slice(stem.length);
      if (input.startsWith(stem) && rest.length <= 5 && !rest.includes(" ") && stem.length > (best?.length ?? 0)) {
        best = { length: stem.length, en: entry.en };
      }
    }
  }
  return best?.en ?? null;
}

/** Splits "vištiena, bulvės; sūris" into unique, trimmed products. */
export function splitProducts(query: string): string[] {
  const seen = new Set<string>();
  const products: string[] = [];
  for (const part of query.split(/[,;\n]+/)) {
    const product = part.trim().replace(/\s+/g, " ");
    const key = normalizeProduct(product);
    if (product && !seen.has(key)) {
      seen.add(key);
      products.push(product);
    }
  }
  return products;
}

export const MAX_PRODUCTS = 5;
export const MAX_PRODUCT_LENGTH = 40;

/**
 * Everyday Lithuanian product names for suggestions while typing. Each one is
 * understood by translateProduct (checked by a test), so a suggestion never
 * ends up as an "unrecognized" product.
 */
export const PRODUCT_SUGGESTIONS = [
  "vištiena", "vištienos krūtinėlė", "vištienos sparneliai", "vištienos kepenėlės", "jautiena", "kiauliena",
  "ėriena", "kalakutiena", "antiena", "malta mėsa", "faršas", "šoninė", "kumpis", "dešrelės", "lašiša", "tunas",
  "menkė", "silkė", "upėtakis", "skumbrė", "krevetės", "kalmarai", "žuvis", "kiaušiniai", "ryžiai", "makaronai",
  "spagečiai", "lakštiniai", "bulvės", "batatai", "pomidorai", "svogūnai", "česnakai", "morkos", "kopūstai",
  "lapiniai kopūstai", "grybai", "paprikos", "sūris", "mocarela", "feta", "parmezanas", "varškė", "kreminis sūris",
  "pienas", "sviestas", "grietinėlė", "grietinė", "jogurtas", "miltai", "cukrus", "duona", "obuoliai", "citrinos",
  "laimai", "bananai", "špinatai", "brokoliai", "agurkai", "cukinijos", "baklažanai", "burokėliai", "pupelės",
  "lęšiai", "avinžirniai", "žirneliai", "kukurūzai", "avižos", "medus", "šokoladas", "aliejus", "alyvuogių aliejus",
  "alyvuogės", "bazilikas", "petražolės", "krapai", "čiobreliai", "raudonėlis", "braškės", "apelsinai", "kriaušės",
  "avokadai", "porai", "salierai", "moliūgas", "grikiai", "manų kruopos", "graikiniai riešutai", "žemės riešutai",
  "migdolai", "razinos", "vyšnios", "avietės", "mėlynės", "imbieras", "cinamonas", "actas", "sojų padažas",
  "kečupas", "majonezas", "garstyčios", "ananasai", "kokosas", "mielės",
] as const;

/** Up to `limit` suggestions starting with (then containing) the typed text. */
export function suggestProducts(typed: string, limit = 6, exclude: string[] = []): string[] {
  const query = normalizeProduct(typed);
  if (query.length < 2) return [];
  const skip = new Set(exclude.map(normalizeProduct));
  const candidates = PRODUCT_SUGGESTIONS.filter((name) => !skip.has(normalizeProduct(name)));
  const starts = candidates.filter((name) => normalizeProduct(name).startsWith(query));
  // Then names where a later word starts with the text ("krūtinėlė" → "vištienos krūtinėlė").
  const contains = candidates.filter((name) => !starts.includes(name) && normalizeProduct(name).split(" ").some((word) => word.startsWith(query)));
  return [...starts, ...contains].slice(0, limit);
}

/** TheMealDB ingredient name → Lithuanian name, built from the suggestions (first match wins). */
const LT_BY_EN = new Map<string, string>();
for (const name of PRODUCT_SUGGESTIONS) {
  for (const en of translateProduct(name) ?? []) {
    const key = en.toLowerCase();
    if (!LT_BY_EN.has(key)) LT_BY_EN.set(key, name);
  }
}

/** "Chicken" → "vištiena"; null when the ingredient is not in the dictionary. */
export function lithuanianName(ingredient: string): string | null {
  return LT_BY_EN.get(ingredient.trim().toLowerCase()) ?? null;
}
