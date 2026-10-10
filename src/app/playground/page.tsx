import { PublicPlayground } from "@/components/marketing/public-playground";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Playground · VariantHub",
  robots: { index: false, follow: false },
};
export default async function PlaygroundPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;
  return (
    <PublicPlayground
      mode={
        mode && ["compare", "arrange", "test", "keep"].includes(mode)
          ? mode
          : "catalog"
      }
    />
  );
}
