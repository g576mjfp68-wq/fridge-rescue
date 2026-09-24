import { expect, test } from "@playwright/test";
import { INGREDIENT_NAMES, lithuanianName, PRODUCT_SUGGESTIONS, suggestProducts, translateProduct } from "../src/lib/ingredients-lt";
import { hasIngredient, kitchenIngredientNames, matchKitchen } from "../src/lib/kitchen-match";

// Pure logic: no network, no database.
test("Pasiūlymai: kiekvienas atpažįstamas, rodomi pagal žodžio pradžią", () => {
  expect(PRODUCT_SUGGESTIONS.filter((name) => !translateProduct(name))).toEqual([]);
  expect(suggestProducts("viš")).toEqual(["vištiena", "vištienos krūtinėlė", "vištienos sparneliai", "vištienos kepenėlės"]);
  expect(suggestProducts("grie")).toEqual(["grietinėlė", "grietinė"]);
  expect(suggestProducts("kru")).toContain("vištienos krūtinėlė");
  expect(suggestProducts("v")).toEqual([]);
  expect(suggestProducts("bul", 6, ["bulvės"])).toEqual([]);
});

test("Lietuviški ingredientų pavadinimai iš žodyno", () => {
  expect(lithuanianName("Chicken")).toBe("vištiena");
  expect(lithuanianName("potatoes")).toBe("bulvės");
  expect(lithuanianName("Garlic Clove")).toBe("česnakai");
  expect(lithuanianName("Onions")).toBe("svogūnai");
  // Singular and plural spellings both work.
  expect(lithuanianName("Carrot")).toBe("morkos");
  expect(lithuanianName("Carrots")).toBe("morkos");
  expect(lithuanianName("Potato")).toBe("bulvės");
  expect(lithuanianName("Gruyère")).toBe("Gruyère sūris");
});

test("Mano virtuvė ir recepto ingredientai: turi / trūksta", () => {
  const ingredients = ["Chicken", "Tomato", "Onions", "Garlic Clove", "Red Pepper", "Carrots", "Lime", "Thyme", "Soy Sauce", "Salt", "Water"];
  const match = matchKitchen(ingredients, ["vištiena", "pomidorai", "svogūnai", "česnakai", "lime"]);
  expect(match.have).toEqual(["Chicken", "Tomato", "Onions", "Garlic Clove", "Lime"]);
  expect(match.missing).toEqual(["Red Pepper", "Carrots", "Thyme", "Soy Sauce"]);
  // Salt and water are not counted.
  expect(match.total).toBe(9);

  const plural = matchKitchen(["Chicken Breasts", "Potatoes", "Cheddar Cheese", "Eggs"], ["vištiena", "bulvės", "sūris"]);
  expect(plural.have).toEqual(["Chicken Breasts", "Potatoes", "Cheddar Cheese"]);
  expect(plural.missing).toEqual(["Eggs"]);
  expect(matchKitchen(["Chicken"], []).have).toEqual([]);
});

test("Kiekvienas lietuviškas ingrediento pavadinimas veikia abiem kryptimis", () => {
  for (const [lt, en] of INGREDIENT_NAMES) {
    // Recognised when typed or moved to the kitchen…
    expect(translateProduct(lt), lt).not.toBeNull();
    for (const name of en) {
      // …shown for the recipe ingredient…
      expect(lithuanianName(name), name).not.toBeNull();
      // …and the kitchen product covers that ingredient (e.g. after "Nupirkau").
      expect(hasIngredient(name, kitchenIngredientNames([lithuanianName(name)!])), `${name} ← ${lithuanianName(name)}`).toBe(true);
    }
  }
  expect(lithuanianName("Allspice")).toBe("kvapieji pipirai");
  expect(lithuanianName("Coconut Milk")).toBe("kokosų pienas");
  // Existing search words keep their meaning.
  expect(translateProduct("cukrus")).toEqual(["Sugar"]);
  expect(translateProduct("kmynai")).toBeNull();
});
