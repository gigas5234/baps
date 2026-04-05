"use client";

import { Fragment } from "react";
import { cn } from "@/lib/utils";

const METRIC_RE =
  /(\d{1,3}(?:,\d{3})*(?:\.\d+)?\s*kcal|\d+(?:\.\d+)?\s*kcal|\d+(?:\.\d+)?kcal|\d+(?:\.\d+)?\s*g\b|\d+\s*ml\b|\d{1,3}(?:,\d{3})*(?:\.\d+)?\s*원|\d+\s*%)/gi;

const KW_RE = /(단백질|탄수화물|지방|칼로리|대사|기아|영양|야식|간식)/g;

function metricClass(m: string) {
  if (/kcal/i.test(m)) {
    return "font-data font-semibold tabular-nums text-teal-600 dark:text-teal-400";
  }
  if (/\bg\b/i.test(m)) {
    return "font-data font-semibold tabular-nums text-amber-600 dark:text-amber-400";
  }
  if (/ml/i.test(m)) {
    return "font-data font-semibold tabular-nums text-sky-600 dark:text-sky-400";
  }
  if (/원/.test(m)) {
    return "font-data font-semibold tabular-nums text-violet-600 dark:text-violet-400";
  }
  if (/%/.test(m)) {
    return "font-data font-semibold tabular-nums text-primary";
  }
  return "font-data font-semibold tabular-nums text-primary";
}

function paintPlain(s: string, keyBase: number): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let last = 0;
  let i = 0;
  const re = new RegExp(KW_RE.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) {
      out.push(
        <span key={`${keyBase}-t-${i++}`} className="text-foreground/90">
          {s.slice(last, m.index)}
        </span>
      );
    }
    out.push(
      <span
        key={`${keyBase}-k-${i++}`}
        className="font-medium text-emerald-600 dark:text-emerald-400"
      >
        {m[0]}
      </span>
    );
    last = m.index + m[0].length;
  }
  if (last < s.length) {
    out.push(
      <span key={`${keyBase}-t-${i++}`} className="text-foreground/90">
        {s.slice(last)}
      </span>
    );
  }
  if (out.length === 0 && s.length > 0) {
    out.push(
      <span key={`${keyBase}-all`} className="text-foreground/90">
        {s}
      </span>
    );
  }
  return out;
}

export function InsightRichText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const parts = text.split(METRIC_RE);
  const nodes: React.ReactNode[] = [];
  let nk = 0;

  parts.forEach((part, idx) => {
    if (part === "") return;
    if (idx % 2 === 1) {
      nodes.push(
        <span key={`m-${nk++}`} className={cn(metricClass(part))}>
          {part}
        </span>
      );
    } else {
      paintPlain(part, nk++).forEach((n, j) => {
        nodes.push(<Fragment key={`p-${idx}-${j}`}>{n}</Fragment>);
      });
    }
  });

  if (nodes.length === 0) {
    return <span className={className}>{text}</span>;
  }

  return <span className={className}>{nodes}</span>;
}
