import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY?.trim();

if (!apiKey) {
  console.error("Trūksta GEMINI_API_KEY. Įrašykite jį į .env.local ir paleiskite npm run test:gemini.");
  process.exitCode = 1;
} else {
  try {
    const ai = new GoogleGenAI({ apiKey, vertexai: false });
    const response = await ai.interactions.create(
      {
        model: "gemini-3.8-flash",
        input: "Parašyk vieną sakinį apie picą.",
        store: false,
      },
      { maxRetries: 0, timeout: 30_000 },
    );

    const text = response.output_text?.trim();
    if (!text) {
      console.error("Gemini negrąžino teksto. Bandymas nesėkmingas.");
      process.exitCode = 1;
    } else {
      console.log(text.replaceAll(apiKey, "[raktas paslėptas]"));
    }
  } catch (error) {
    // Do not log the error object, request headers, or credentials.
    const status = error?.status ?? error?.statusCode;
    if (status === 429) {
      console.error("Pasiektas Gemini užklausų arba kvotos limitas (429 / RESOURCE_EXHAUSTED). Bandykite vėliau.");
    } else if (status === 400 || status === 401 || status === 403) {
      console.error("Gemini atmetė užklausą. Patikrinkite GEMINI_API_KEY ir projekto prieigos nustatymus.");
    } else if (status === 404) {
      console.error("Modelis gemini-3.8-flash šiam projektui nepasiekiamas arba nerastas.");
    } else {
      console.error("Gemini bandymas nepavyko. Patikrinkite ryšį ir modelio prieinamumą; užklausa automatiškai nekartojama.");
    }
    process.exitCode = 1;
  }
}
