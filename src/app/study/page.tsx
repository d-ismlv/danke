import StudyScreen from "@/components/StudyScreen";

export const dynamic = "force-dynamic";
export const metadata = { title: "Study" };

export default async function StudyEverything({
  searchParams,
}: {
  searchParams: Promise<{ round?: string }>;
}) {
  const { round } = await searchParams;
  return (
    <StudyScreen
      scope={{ kind: "library" }}
      what="your library"
      backHref="/"
      backLabel="Library"
      round={Number(round) || 1}
    />
  );
}
