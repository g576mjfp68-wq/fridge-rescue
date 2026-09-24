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

/**
 * Lithuanian names for other frequent TheMealDB ingredients (spices, stocks,
 * sauces…), so recipes read in Lithuanian. New names are added to the
 * dictionary too, so a name that reaches "Mano virtuvė" (e.g. via "Nupirkau")
 * is recognised again; names already in the dictionary only label variants
 * ("Ground Cinnamon" → "cinamonas"). Checked by a round-trip test.
 */
export const INGREDIENT_NAMES: [lt: string, en: string[]][] = [
  ["druska", ["Salt", "Sea Salt", "Kosher Salt"]],
  ["vanduo", ["Water", "Warm Water", "Cold Water", "Boiling Water"]],
  ["augalinis aliejus", ["Vegetable Oil"]],
  ["pipirai", ["Pepper"]],
  ["juodieji pipirai", ["Black Pepper", "Ground Black Pepper", "Peppercorns"]],
  ["kvietiniai miltai", ["Plain Flour", "All Purpose Flour"]],
  ["savaime kylantys miltai", ["Self-raising Flour"]],
  ["kalendra", ["Coriander", "Coriander Leaves", "Cilantro"]],
  ["malta kalendra", ["Ground Coriander"]],
  ["svogūnų laiškai", ["Spring Onions", "Scallions"]],
  ["kepimo milteliai", ["Baking Powder"]],
  ["smulkusis cukrus", ["Caster Sugar", "Golden Caster Sugar"]],
  ["cukraus pudra", ["Icing Sugar", "Powdered Sugar"]],
  ["rudasis cukrus", ["Brown Sugar", "Muscovado Sugar"]],
  ["cukrus", ["Granulated Sugar", "Palm Sugar"]],
  ["maltoji paprika", ["Paprika"]],
  ["rūkyta paprika", ["Smoked Paprika"]],
  ["čili pipirai", ["Red Chilli", "Green Chilli", "Chilli", "Birds-eye Chillies", "Scotch Bonnet", "Jalapeno"]],
  ["čili milteliai", ["Chilli Powder", "Chili Powder"]],
  ["aitrioji paprika", ["Cayenne Pepper"]],
  ["čili dribsniai", ["Chilli Flakes", "Red Pepper Flakes"]],
  ["pomidorų tyrė", ["Tomato Puree"]],
  ["pomidorų padažas", ["Tomato Sauce"]],
  ["konservuoti pomidorai", ["Tinned Tomatos", "Chopped Tomatoes"]],
  ["pomidorai", ["Plum Tomatoes"]],
  ["vištienos sultinys", ["Chicken Stock", "Chicken Stock Cube"]],
  ["jautienos sultinys", ["Beef Stock"]],
  ["daržovių sultinys", ["Vegetable Stock", "Vegetable Stock Cube"]],
  ["žuvies sultinys", ["Fish Stock"]],
  ["vanilės ekstraktas", ["Vanilla Extract", "Vanilla"]],
  ["lauro lapai", ["Bay Leaf", "Bay Leaves"]],
  ["raudonieji svogūnai", ["Red Onions"]],
  ["askaloniniai česnakai", ["Shallots", "Challots"]],
  ["kukurūzų krakmolas", ["Cornstarch", "Corn Flour", "Starch"]],
  ["mėtos", ["Mint"]],
  ["citrinų sultys", ["Lemon Juice"]],
  ["laimų sultys", ["Lime Juice"]],
  ["citrinos", ["Lemon Zest"]],
  ["kuminas", ["Cumin", "Ground Cumin", "Cumin Seeds"]],
  ["žuvies padažas", ["Fish Sauce"]],
  ["austrių padažas", ["Oyster Sauce"]],
  ["Vusterio padažas", ["Worcestershire Sauce"]],
  ["saldus čili padažas", ["Sweet Chilli Sauce"]],
  ["aštrus padažas", ["Hotsauce"]],
  ["sviestas", ["Unsalted Butter", "Salted Butter", "Melted Butter"]],
  ["kiaušinių tryniai", ["Egg Yolks"]],
  ["kiaušinių baltymai", ["Egg White"]],
  ["kvapieji pipirai", ["Allspice"]],
  ["čorizo dešra", ["Chorizo"]],
  ["muskato riešutas", ["Nutmeg", "Ground Nutmeg"]],
  ["sezamų aliejus", ["Sesame Seed Oil"]],
  ["sezamo sėklos", ["Sesame Seed"]],
  ["džiūvėsėliai", ["Breadcrumbs"]],
  ["cinamonas", ["Ground Cinnamon"]],
  ["cinamono lazdelė", ["Cinnamon Stick"]],
  ["graikiškas jogurtas", ["Greek Yogurt"]],
  ["kardamonas", ["Cardamom", "Ground Cardomom"]],
  ["baltasis vynas", ["White Wine", "Dry White Wine"]],
  ["raudonasis vynas", ["Red Wine"]],
  ["sausas šeris", ["Dry Sherry"]],
  ["brendis", ["Brandy"]],
  ["ciberžolė", ["Turmeric"]],
  ["rozmarinas", ["Rosemary"]],
  ["raudonojo vyno actas", ["Red Wine Vinegar"]],
  ["baltojo vyno actas", ["White Wine Vinegar"]],
  ["ryžių actas", ["Rice Vinegar"]],
  ["obuolių actas", ["Apple Cider Vinegar"]],
  ["balzamiko actas", ["Balsamic Vinegar"]],
  ["šerio actas", ["Sherry Vinegar"]],
  ["actas", ["White Vinegar"]],
  ["imbieras", ["Ground Ginger"]],
  ["ryžių makaronai", ["Rice Noodles"]],
  ["ryžiai", ["Basmati Rice", "Jasmine Rice", "Paella Rice"]],
  ["gvazdikėliai", ["Cloves"]],
  ["laiškiniai česnakai", ["Chives"]],
  ["salotos", ["Lettuce"]],
  ["rukola", ["Rocket"]],
  ["šafranas", ["Saffron"]],
  ["kreminė grietinė", ["Creme Fraiche"]],
  ["kondensuotas pienas", ["Condensed Milk"]],
  ["karamelizuotas kondensuotas pienas", ["Dulce De Leche"]],
  ["pienas", ["Whole Milk"]],
  ["raudonėlis", ["Dried Oregano"]],
  ["kario milteliai", ["Curry Powder"]],
  ["česnakų milteliai", ["Garlic Powder"]],
  ["garam masala", ["Garam Masala"]],
  ["tajų raudonojo kario pasta", ["Thai Red Curry Paste"]],
  ["harisos prieskoniai", ["Harissa Spice"]],
  ["sluoksniuota tešla", ["Puff Pastry"]],
  ["trapi tešla", ["Shortcrust Pastry"]],
  ["pitos duona", ["Pita Bread"]],
  ["batonas", ["Baguette"]],
  ["pupelių daigai", ["Bean Sprouts"]],
  ["kiauliena", ["Ground Pork"]],
  ["jautiena", ["Beef Brisket"]],
  ["jautienos nugarinė", ["Sirloin Steak"]],
  ["vištiena", ["Chicken Legs"]],
  ["ėriena", ["Lamb Leg"]],
  ["krevetės", ["Raw King Prawns"]],
  ["kokosų pienas", ["Coconut Milk"]],
  ["kokosų grietinėlė", ["Coconut Cream"]],
  ["kokosų drožlės", ["Desiccated Coconut"]],
  ["žemės riešutų sviestas", ["Peanut Butter"]],
  ["pinijų riešutai", ["Pine Nuts"]],
  ["migdolai", ["Ground Almonds"]],
  ["migdolų ekstraktas", ["Almond Extract"]],
  ["apelsinų žiedų vanduo", ["Orange Blossom Water"]],
  ["kopūstai", ["White Cabbage", "Red Cabbage"]],
  ["rauginti kopūstai", ["Sauerkraut"]],
  ["parmezanas", ["Parmesan Cheese"]],
  ["maskarponė", ["Mascarpone"]],
  ["grietinėlė", ["Whipping Cream"]],
  ["garstyčios", ["Dijon Mustard", "English Mustard"]],
  ["valgomoji soda", ["Bicarbonate Of Soda"]],
  ["juodosios pupelės", ["Black Beans"]],
  ["baltosios pupelės", ["Cannellini Beans", "Dried White Beans"]],
  ["pankolis", ["Fennel"]],
  ["rapsų aliejus", ["Rapeseed Oil"]],
  ["kiauliniai taukai", ["Lard"]],
  ["kulinariniai riebalai", ["Shortening"]],
  ["auksinis sirupas", ["Golden Syrup"]],
  ["klevų sirupas", ["Maple Syrup"]],
  ["skystas medus", ["Clear Honey"]],
  ["melasa", ["Black Treacle", "Molasses"]],
  ["tamarindų pasta", ["Tamarind Paste"]],
  ["žvaigždanyžis", ["Star Anise"]],
  ["mairūnas", ["Marjoram"]],
  ["kakava", ["Cocoa Powder"]],
  ["džiovinti abrikosai", ["Dried Apricots"]],
  ["gervuogės", ["Blackberries"]],
  ["sausainiai", ["Digestive Biscuits"]],
  ["griežčiai", ["Swede"]],
  ["pistacijos", ["Pistachio"]],
  ["mėtos", ["Dried Mint"]],
  ["duonos miltai", ["Strong White Bread Flour"]],
  ["kanolų aliejus", ["Canola Oil"]],
  ["krevetės", ["King Prawns", "Tiger Prawns", "Raw Tiger Prawns"]],
  ["kiaušinių kremas", ["Custard"]],
  ["mangai", ["Mango"]],
  ["mielės", ["Instant Yeast"]],
  ["citrinų žolė", ["Lemongrass", "Lemongrass Stalks"]],
  ["žemės riešutų aliejus", ["Peanut Oil", "Ground Nut Oil"]],
  ["vanilinis cukrus", ["Vanilla Sugar"]],
  ["kiauliena", ["Pork Shoulder", "Pork Chops"]],
  ["vanilės ankštis", ["Vanilla Pod"]],
  ["pekano riešutai", ["Pecan Nuts"]],
  ["filo tešla", ["Filo Pastry"]],
  ["sūdyta menkė", ["Salt Cod"]],
  ["balta žuvis", ["White Fish"]],
  ["salierų šaknis", ["Celeriac"]],
  ["jautienos taukai", ["Suet"]],
  ["česnakai", ["Minced Garlic"]],
  ["jautienos išpjova", ["Beef Fillet"]],
  ["kmynų sėklos", ["Caraway Seed"]],
  ["džiovintos slyvos", ["Prunes"]],
  ["džiovinti vaisiai", ["Dried Fruit"]],
  ["duona", ["Crusty Bread"]],
  ["šokolado lašeliai", ["Chocolate Chips"]],
  ["grietinėlė", ["Single Cream"]],
  ["rudasis cukrus", ["Dark Brown Soft Sugar"]],
  ["salierų druska", ["Celery Salt"]],
  ["pomidorų pasata", ["Passata"]],
  ["rožių vanduo", ["Rose Water"]],
  ["bulvės", ["New Potatoes", "Russet Potato"]],
  ["moliuskai", ["Clams"]],
  ["midijos", ["Mussels"]],
  ["šparagai", ["Asparagus"]],
  ["grybai", ["Shiitake Mushrooms"]],
  ["Gruyère sūris", ["Gruyère"]],
  ["svogūnai", ["Chopped Onion"]],
  ["uogienė", ["Jam"]],
  ["kvapieji pipirai", ["Ground Allspice"]],
  ["universalūs prieskoniai", ["All-purpose Seasoning"]],
  ["rūkyta juodadėmė menkė", ["Smoked Haddock"]],
  ["šalavijas", ["Sage"]],
  ["lęšiai", ["Brown Lentils"]],
  ["žemės riešutai", ["Roasted Peanut"]],
  ["galangalas", ["Galangal"]],
  ["pankolio sėklos", ["Fennel Seeds"]],
  ["raudonųjų pipirų pasta", ["Red Pepper Paste"]],
  ["kukurūzų miltai", ["Cornmeal"]],
];

// New Lithuanian names become exact phrases in the dictionary.
for (const [lt, en] of INGREDIENT_NAMES) {
  if (!translateProduct(lt)) ENTRIES.push({ phrases: [normalizeProduct(lt)], en });
}

/**
 * TheMealDB ingredient name → Lithuanian name. The specific names above win
 * ("Coconut Milk" → "kokosų pienas"), then the everyday suggestions.
 */
const LT_BY_EN = new Map<string, string>();

/** "Carrots" and "Carrot", "Tomatoes" and "Tomato" share one key. */
function englishKey(name: string): string {
  return normalizeProduct(name).split(/[^a-z]+/).filter(Boolean)
    .map((word) => word.replace(/(oes|ies|es|s)$/, (end) => (end === "ies" ? "y" : end === "oes" ? "o" : "")))
    .join(" ");
}

for (const [lt, en] of INGREDIENT_NAMES) {
  for (const name of en) if (!LT_BY_EN.has(englishKey(name))) LT_BY_EN.set(englishKey(name), lt);
}
for (const name of PRODUCT_SUGGESTIONS) {
  for (const en of translateProduct(name) ?? []) {
    if (!LT_BY_EN.has(englishKey(en))) LT_BY_EN.set(englishKey(en), name);
  }
}

/** "Chicken" → "vištiena"; null when the ingredient is not in the dictionary. */
export function lithuanianName(ingredient: string): string | null {
  return LT_BY_EN.get(englishKey(ingredient)) ?? null;
}
