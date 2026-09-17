import { PublicStorePage } from "@/features/catalog/PublicStorePage";

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PublicStorePage slug={slug} />;
}