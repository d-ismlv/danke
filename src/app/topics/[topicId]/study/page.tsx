import { notFound } from "next/navigation";
import { getTopicLabel } from "@/lib/queries";
import StudyScreen from "@/components/StudyScreen";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ topicId: string }> }) {
  const topic = await getTopicLabel((await params).topicId);
  if (!topic) notFound();
  return { title: `Study · ${topic.name}` };
}

export default async function StudyTopic({
  params,
  searchParams,
}: {
  params: Promise<{ topicId: string }>;
  searchParams: Promise<{ round?: string }>;
}) {
  const { topicId } = await params;
  const { round } = await searchParams;
  const topic = await getTopicLabel(topicId);
  if (!topic) notFound();

  return (
    <StudyScreen
      scope={{ kind: "topic", id: topicId }}
      what={topic.name}
      where={topic.deckName}
      backHref={`/topics/${topicId}`}
      backLabel={topic.name}
      round={Number(round) || 1}
      showTopic={false}
    />
  );
}
