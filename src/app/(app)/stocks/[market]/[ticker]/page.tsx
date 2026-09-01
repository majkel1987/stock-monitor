import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/layout/placeholder-page";

type StockPageProps = {
  params: Promise<{ market: string; ticker: string }>;
};

export async function generateMetadata({
  params,
}: StockPageProps): Promise<Metadata> {
  const { ticker } = await params;

  return { title: ticker.toUpperCase() };
}

export default async function StockPage({ params }: StockPageProps) {
  const { market, ticker } = await params;

  return (
    <PlaceholderPage
      eyebrow={market.toUpperCase()}
      title={ticker.toUpperCase()}
      description="The canonical stock-detail route is established. Real content and mock data belong to the next implementation step."
    />
  );
}
