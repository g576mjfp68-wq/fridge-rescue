# Fridge Rescue

Mokomoji Next.js aplikacija: receptų paieška ir pilno recepto peržiūra (3–5 užduotys). Paruoštos Supabase bibliotekos ir klientai (6 užduotis); registracija, prisijungimas ir išsaugojimas dar neįgyvendinti. Gemini neprijungtas.

## Paleidimas

Projektas yra tiesiai `FRIDGE` aplanke. npm paketo pavadinimas – `fridge-rescue`.
Kurta ir tikrinta su Node.js `24.19.0`, Next.js `16.3.5`, TypeScript ir App Router.

```bash
npm install
npm run dev
```

Atidarykite http://localhost:3000. Receptų paieška veikia ir su tuščiais Supabase laukais `.env.local` faile.
`.gitignore` ignoruoja `.env*`, priklausomybes, build ir testų rezultatus.
Nenaudojami mokami planai ar mokamas API raktas. TheMealDB mokomajai prieigai naudojamas viešas raktas `1`.

## Supabase paruošimas (6 užduotis)

Įdiegtos oficialios bibliotekos `@supabase/supabase-js` ir `@supabase/ssr`.
Projekto šaknyje `.env.example` pateikia tuščius laukus, o savo reikšmes įrašykite tik į `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

- `NEXT_PUBLIC_SUPABASE_URL` – jūsų Supabase projekto API adresas.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` – viešas aplikacijos API raktas, tinkamas naršyklei. Jis nesuteikia administratoriaus teisių ir neapeina RLS. Vartotojų autentifikavimas bei duomenų RLS taisyklės bus įgyvendinami vėlesniuose žingsniuose.

Abu `NEXT_PUBLIC_` kintamieji gali patekti į naršyklės kodą. `.env.local` nelaikomas būdu juos paslėpti nuo naršyklės: failas ignoruojamas Git, kad vietinė konfigūracija ir kiti galimi slapti kintamieji nepatektų į saugyklos istoriją. `.env.example` galima versijuoti, nes jame nėra reikšmių. Užpildę laukus perkraukite `npm run dev`; produkciniam variantui reikia naujo build.

Klientų failai:

- `src/lib/supabase/client.ts`: `createClient()` naršyklės komponentams, su SSR paketo slapukų saugykla.
- `src/lib/supabase/server.ts`: `await createClient()` serverio komponentams, Server Actions ir Route Handlers; naudoja `await cookies()` bei `getAll` / `setAll` adapterį. Serverio klientas kuriamas kiekvienai užklausai atskirai ir pažymėtas `server-only`.
- `src/lib/supabase/config.ts`: perskaito tik abu nurodytus viešus kintamuosius. Trūkstant bent vieno, klientų kūrimo funkcijos grąžina `null`; būsimas juos naudojantis kodas turės tai patikrinti.

Šiame žingsnyje klientai neprijungti prie esamų puslapių ir nevykdomos Supabase užklausos. Prieš įjungiant autentifikavimą reikės pridėti oficialų Next.js `proxy.ts` sesijos atnaujinimui, nes serverio komponentai negali patys įrašyti slapukų. Tikras ryšys bus tikrinamas įrašius projekto reikšmes.

## Duomenų kelias

1. Naršyklėje vartotojas pasirenka paieškos būdą ir įveda tekstą anglų kalba.
2. Naršyklė kreipiasi į `GET /api/recipes?mode=ingredient&q=chicken` arba `GET /api/recipes?mode=name&q=Arrabiata`.
3. Next.js serveris kreipiasi į TheMealDB `filter.php?i=...` arba `search.php?s=...`. Įvestis koduojama `URLSearchParams`.
4. Kortelės rodo iš API gautą pavadinimą, nuotrauką ir ID. Nuotraukos įkeliamos tiesiogiai iš API pateiktų TheMealDB vaizdų adresų; receptų JSON gaunamas tik per serverį.
5. Paspaudus kortelę atidaromas `/receptai/[id]`. Naršyklė prašo `GET /api/recipes/[id]`, o serveris vykdo TheMealDB `lookup.php?i=ID`.
6. Rodoma kategorija, kilmė, netušti ingredientai su kiekiais ir originali instrukcija. Duomenys nėra ranka sukurti ar automatiškai verčiami.

ID susieja paieškos rezultatą su konkrečiu receptu. Ingredientų paieška grąžina santrauką, todėl pasirinktas ID tampa pilno recepto užklausos įvestimi.

Paieškos būdas ir tekstas saugomi URL. Paskutiniai rezultatai iki 30 minučių saugomi `sessionStorage`, kad grįžus būtų parodyti be pakartotinės paieškos. Jei saugykla neprieinama, paieška atkuriama iš URL ir API. Uždarius kortelę naršyklės sesijos saugykla išvaloma.

## Klaidos ir prieinamumas

- Tikrinama tuščia / per ilga įvestis ir keli kableliais ar kabliataškiais atskirti ingredientai.
- Krovimo metu paieškos forma ir pavyzdžių mygtukai išjungiami; `ref` apsaugo ir nuo dviejų vienalaikių pateikimų.
- Keičiant URL arba išeinant iš puslapio sena užklausa atšaukiama. Papildoma aktualumo patikra neleidžia senam atsakymui perrašyti naujo.
- TheMealDB laukimo riba – 12 s, naršyklės užklausos – 18 s.
- Atskirai rodomi nerasti rezultatai, neegzistuojantis receptas, tinklo, HTTP, netinkamų duomenų ir limitų pranešimai. Klaidas galima pakartoti rankiniu būdu; automatinės pakartojimų kilpos nėra.
- Lietuviški laukelių pavadinimai, valdymas klaviatūra, matomas fokusas, pranešimai pagalbinėms technologijoms ir mažesnio judesio nuostatos.

HTTP statusas – serverio atsakymo skaitinis kodas. `200` reiškia sėkmingą HTTP atsakymą, `400` – netinkamą įvestį, `404` – nerastą receptą, `429` – limitą, `502` – išorinės paslaugos ar jos duomenų klaidą, `504` – laukimo laiko viršijimą. `response.ok` yra `true` statusams nuo 200 iki 299; papildomai tikrinami JSON ir duomenų laukai. Tuščias paieškos rezultatas su HTTP 200 yra sėkminga užklausa, kuri nerado receptų.

Išskleidžiamas Developer Mode rodo paskutinę dabartinio vaizdo TheMealDB operaciją: sistemą, endpoint, metodą, išorinės API statusą, sėkmę ir trukmę. Išorinės API statusas gali skirtis nuo vietinio atsakymo: pavyzdžiui, `lookup.php` grąžina HTTP 200 ir `meals: null`, o mūsų endpoint grąžina HTTP 404. Jokie raktai, užklausų turinys ar sesijos duomenys į šį skydelį nepatenka.

## Patikros

```bash
npm run lint
npm run build
# Kitame terminale turi veikti npm run dev arba npm run start:
npm run test:e2e
```

Playwright naudoja įdiegtą Google Chrome ir tikrina kompiuterio bei telefono dydžio vaizdus. Tai telefono emuliacija Chrome, ne bandymas fiziniame telefone ar Safari. `TEST_BASE_URL` leidžia pasirinkti kitą serverio adresą, `PLAYWRIGHT_CHANNEL` – kitą įdiegtą Playwright naršyklės kanalą (pvz., `chromium`).

Testai naudoja gyvą TheMealDB: `chicken`, `beef`, `tomato`, `Arrabiata`, ID `52940`, duomenis ir nuotraukas, grįžimą mygtuku bei naršyklės „Atgal“. Papildomai tikrinama tuščia įvestis, nerasti rezultatai, URL kodavimas ir horizontalus perpildymas. Tinklo / HTTP klaidos ir užklausų lenktynės simuliuojamos; atkartojami receptų duomenys imami iš tikro API. Ekrano nuotraukos ir nesėkmingų testų medžiaga saugomos ignoruojamame `test-results` aplanke.

Rankiniu būdu išbandykite abi paieškas, pasirinkite kortelę, patikrinkite ingredientus ir grįžkite į rezultatus. Sumažinkite naršyklės langą iki telefono pločio ir pabandykite naudoti tik `Tab`, rodykles bei `Enter`.

## Dokumentacija

- [Next.js diegimas](https://nextjs.org/docs/app/getting-started/installation)
- [TheMealDB API ir mokomojo rakto sąlygos](https://www.themealdb.com/api.php)
- [Oficialūs Supabase SSR klientai](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Supabase API raktų paskirtis](https://supabase.com/docs/guides/getting-started/api-keys)
