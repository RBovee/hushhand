import { MatchTable } from "@/components/match-table";

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MatchTable id={id} />;
}
