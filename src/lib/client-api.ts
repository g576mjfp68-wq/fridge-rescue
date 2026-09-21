import type { ApiOperation, ApiResponse } from "./types";

export class ClientApiError extends Error {
  constructor(message: string, public operation?: ApiOperation) {
    super(message);
  }
}

export async function fetchApi<T>(path: string, signal: AbortSignal): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(path, {
      signal: AbortSignal.any([signal, AbortSignal.timeout(18_000)]),
      headers: { Accept: "application/json" },
    });
    let payload: ApiResponse<T>;
    try {
      payload = await response.json();
    } catch {
      throw new ClientApiError(`Serveris grąžino netinkamą atsakymą (HTTP ${response.status}). Bandykite dar kartą.`);
    }
    if (!response.ok || payload.error) {
      throw new ClientApiError(payload.error || `Užklausa nepavyko (HTTP ${response.status}).`, payload.operation);
    }
    if (payload.data === undefined) throw new ClientApiError("Serverio atsakyme trūksta duomenų.", payload.operation);
    return payload;
  } catch (error) {
    if (signal.aborted) throw error;
    if (error instanceof ClientApiError) throw error;
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new ClientApiError("Serveris neatsakė laiku. Bandykite dar kartą.");
    }
    throw new ClientApiError("Nepavyko prisijungti prie serverio. Patikrinkite interneto ryšį ir bandykite dar kartą.");
  }
}
