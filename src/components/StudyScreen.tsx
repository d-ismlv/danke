import { buildQueue, now, SESSION_LIMIT, type Scope } from "@/lib/queries";
import { rowToFsrsCard, intervalPreviews } from "@/lib/fsrs";
import StudySession, { type StudyItem } from "./StudySession";

/**
 * The server half of a study session: it builds the queue and works out the
 * interval each grade would buy, so `ts-fsrs` never has to reach the browser.
 *
 * All three study routes render this. There is one session behaviour in the
 * app and this is it — the only thing that differs between studying a topic, a
 * deck or everything is which cards go into the queue.
 */
export default async function StudyScreen({
  scope,
  what,
  where,
  backHref,
  backLabel,
  round,
  showTopic,
}: {
  scope: Scope;
  what: string;
  where?: string;
  backHref: string;
  backLabel: string;
  round: number;
  showTopic: boolean;
}) {
  const at = now();
  const { cards, total } = await buildQueue(scope, at);
  const clock = new Date(at);

  const queue: StudyItem[] = cards.map((card) => ({
    id: card.id,
    title: card.title,
    points: card.points,
    topicName: card.topicName,
    previews: intervalPreviews(rowToFsrsCard(card.state), clock),
  }));

  const base = backHref === "/" ? "/study" : `${backHref}/study`;

  return (
    <StudySession
      key={round}
      what={what}
      where={where}
      backHref={backHref}
      backLabel={backLabel}
      nextRoundHref={`${base}?round=${round + 1}`}
      queue={queue}
      remaining={Math.max(0, total - SESSION_LIMIT)}
      showTopic={showTopic}
    />
  );
}
