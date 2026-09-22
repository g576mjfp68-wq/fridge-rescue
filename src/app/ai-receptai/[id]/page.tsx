import { AiRecipeDetail } from "@/components/ai-recipe-detail";

export default async function AiRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <AiRecipeDetail id={id} />;
}