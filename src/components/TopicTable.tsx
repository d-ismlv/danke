"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { StatusMark, MarkBar, MarkLegend } from "./Marks";
import { DueCell, NumCell, plural } from "./Cells";
import { statusLabel, type CardMark, type LearningStatus } from "@/lib/status";

export type TopicRow = {
  id: string;
  name: string;
  cards: number;
  due: number;
  unseen: number;
  status: LearningStatus;
  /** Why the topic needs attention, when it does. */
  reason: string | null;
  marks: CardMark[];
  /** Epoch ms of the most recent answer in this topic, or null. */
  lastStudied: number | null;
  /** The same moment as a row reads it: Today, Yesterday, 3 days ago. */
  when: string;
};

const SORTS = {
  /* What you were working on, at the top. A topic never studied has nothing
     to be recent about, so those come last, by name. */
  latest: {
    label: "Latest",
    compare: (a: TopicRow, b: TopicRow) =>
      (b.lastStudied ?? 0) - (a.lastStudied ?? 0) || byName(a, b),
  },
  due: { label: "Due", compare: (a: TopicRow, b: TopicRow) => b.due - a.due || byName(a, b) },
  name: { label: "Name", compare: byName },
  cards: {
    label: "Cards",
    compare: (a: TopicRow, b: TopicRow) => b.cards - a.cards || byName(a, b),
  },
} as const;

type SortKey = keyof typeof SORTS;

function byName(a: TopicRow, b: TopicRow) {
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

/**
 * The topics in a deck, and the one control on the page: which order to read
 * them in. Sorting is local — it reorders rows that are already here rather
 * than asking the server for the same rows again.
 */
export default function TopicTable({ topics }: { topics: TopicRow[] }) {
  const [sort, setSort] = useState<SortKey>("latest");
  const ordered = useMemo(() => [...topics].sort(SORTS[sort].compare), [topics, sort]);

  return (
    <>
      <div className="section-head">
        <h2 className="section-title" id="topics-title">
          Topics
        </h2>
        <div className="segmented" role="group" aria-label="Sort topics">
          {(Object.keys(SORTS) as SortKey[]).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={sort === key}
              onClick={() => setSort(key)}
            >
              {SORTS[key].label}
            </button>
          ))}
        </div>
      </div>

      <div className="table t-topics">
        <div className="table__inner">
          <div className="table__head" aria-hidden="true">
            <span className="cell-name">Topic</span>
            <span className="c-bar">Cards, one segment each</span>
            <span className="cell-num">Due</span>
            <span className="cell-num">Unseen</span>
            <span className="cell-num c-when">Last studied</span>
          </div>
          <div className="table__body">
            {ordered.map((topic) => (
              <Link key={topic.id} href={`/topics/${topic.id}`} className="table__row">
                <span className="cell-name">
                  <StatusMark status={topic.status} />
                  <span>
                    <strong className="row-name">{topic.name}</strong>
                    <small className="row-sub" title={topic.reason ?? undefined}>
                      {topic.status === "struggling" ? (
                        <span className="row-sub__flag">{statusLabel(topic.status)}</span>
                      ) : (
                        statusLabel(topic.status)
                      )}{" "}
                      · {plural(topic.cards, "card")}
                    </small>
                  </span>
                </span>
                <MarkBar marks={topic.marks} className="c-bar" />
                <DueCell due={topic.due} />
                <NumCell n={topic.unseen} />
                <span className="cell-when c-when">{topic.when}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <MarkLegend marks={["mature", "young", "learning", "due", "unseen"]} />
    </>
  );
}
