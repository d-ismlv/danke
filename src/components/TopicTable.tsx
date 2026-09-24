"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Icon from "./Icon";
import { StatusMark, StatePips, MarkLegend, WaitingFigure } from "./Marks";
import type { CardMark, LearningStatus } from "@/lib/status";

export type TopicRow = {
  id: string;
  name: string;
  cards: number;
  due: number;
  unseen: number;
  status: LearningStatus;
  marks: CardMark[];
};

const SORTS = {
  due: { label: "Due count", compare: (a: TopicRow, b: TopicRow) => b.due - a.due || byName(a, b) },
  name: { label: "Topic name", compare: byName },
  cards: {
    label: "Card count",
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
  const [sort, setSort] = useState<SortKey>("due");
  const ordered = useMemo(() => [...topics].sort(SORTS[sort].compare), [topics, sort]);

  return (
    <>
      <header className="section-heading">
        <div>
          <h2 id="topics-title">Topics</h2>
        </div>
        <label className="sort-control">
          <span>Sorted by</span>
          <select
            aria-label="Sort topics"
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
          >
            {(Object.keys(SORTS) as SortKey[]).map((key) => (
              <option key={key} value={key}>
                {SORTS[key].label}
              </option>
            ))}
          </select>
        </label>
      </header>

      <div className="topic-table">
        {ordered.map((topic) => (
          <Link key={topic.id} href={`/topics/${topic.id}`} className="topic-table__row">
            <StatusMark status={topic.status} shape="dot" />
            <span className="row-name">
              <strong>{topic.name}</strong>
              <small>
                {topic.cards} card{topic.cards === 1 ? "" : "s"}
              </small>
            </span>
            <StatePips marks={topic.marks} />
            <span className="row-figures">
              <WaitingFigure due={topic.due} unseen={topic.unseen} />
            </span>
            <Icon name="arrow" className="row-arrow" />
          </Link>
        ))}
      </div>

      <MarkLegend marks={["mature", "young", "learning", "due"]} end />
    </>
  );
}
