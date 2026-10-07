"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import Icon from "./Icon";
import { DueCell, LearnedBar, plural } from "./Cells";
import { statusLabel, type LearningStatus } from "@/lib/status";

export type TopicRow = {
  id: string;
  name: string;
  cards: number;
  due: number;
  learned: number;
  percent: number;
  status: LearningStatus;
  /** Why the topic needs attention, when it does. */
  reason: string | null;
  /** Epoch ms of the most recent answer in this topic, or null. */
  lastStudied: number | null;
  /** The same moment as a row reads it: today, yesterday, 3 days ago. */
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
 * The topics in a deck, the order to read them in, and the deck's own tools.
 * Sorting is local — it reorders rows that are already here rather than
 * asking the server for the same rows again.
 *
 * The order is one quiet select rather than a row of buttons, and the tools
 * wait under the list: neither is what a deck is opened for.
 */
export default function TopicTable({ topics, tools }: { topics: TopicRow[]; tools?: ReactNode }) {
  const [sort, setSort] = useState<SortKey>("latest");
  const ordered = useMemo(() => [...topics].sort(SORTS[sort].compare), [topics, sort]);

  return (
    <>
      <div className="section-head">
        <h2 className="section-title" id="topics-title">
          Topics
        </h2>
        <label className="sort">
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
          <Icon name="chevron" />
        </label>
      </div>

      <div className="table t-rows">
        <div className="table__inner">
          <div className="table__head" aria-hidden="true">
            <span className="c-bar">Learned</span>
          </div>
          <div className="table__body">
            {ordered.map((topic) => (
              <Link key={topic.id} href={`/topics/${topic.id}`} className="table__row">
                <span className="cell-name">
                  <strong className="row-name">{topic.name}</strong>
                  <small className="row-sub" title={topic.reason ?? undefined}>
                    {topic.status === "struggling" ? (
                      <>
                        <span className="row-sub__flag">{statusLabel(topic.status)}</span> ·{" "}
                        {plural(topic.cards, "card")}
                      </>
                    ) : (
                      `${plural(topic.cards, "card")} · ${topic.when}`
                    )}
                  </small>
                </span>
                <LearnedBar learned={topic.learned} cards={topic.cards} className="c-bar" />
                <span className="cell-num c-pct">{topic.percent}%</span>
                <DueCell due={topic.due} />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {tools && <div className="list-foot">{tools}</div>}
    </>
  );
}
