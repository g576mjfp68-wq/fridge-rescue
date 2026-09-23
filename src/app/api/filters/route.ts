import { getFilterOptions } from "@/lib/meal-filters";
import { apiErrorResponse } from "@/lib/mealdb";

/** Category and world-cuisine options (Lithuanian labels, original API values). */
export async function GET() {
  try {
    const { options, operations } = await getFilterOptions();
    return Response.json({ data: options, operation: operations.at(-1), operations });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
