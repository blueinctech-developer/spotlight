/**
 * Weekly submission counts as thin vertical bars (single series, one hue).
 * Each bar carries a native tooltip and the data is also exposed as a table for screen readers.
 */
export function SubmissionsChart({ data }: { data: { label: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((n, d) => n + d.count, 0);
  return (
    <figure>
      <figcaption className="mb-2 text-xs text-zinc-500">
        <span className="font-semibold tabular-nums text-zinc-900">{total}</span> submissions per week
      </figcaption>
      <div className="relative h-28 border-b border-zinc-200" aria-hidden>
        <div className="absolute inset-x-0 top-0 border-t border-dashed border-zinc-100" />
        <span className="absolute right-0 top-0 -translate-y-1/2 bg-white pl-1 text-[10px] tabular-nums text-zinc-500">{max}</span>
        <div className="flex h-full items-end gap-[2px] pr-6">
          {data.map((d, i) => (
            <div key={i} className="group relative flex h-full flex-1 items-end justify-center" title={`Week of ${d.label}: ${d.count}`}>
              <div
                className="w-full max-w-[28px] rounded-t-[4px] bg-brand-700 transition-colors group-hover:bg-brand-600"
                style={{ height: d.count ? `${Math.max(4, (d.count / max) * 100)}%` : "2px", opacity: d.count ? 1 : 0.25 }}
              />
              <span className="pointer-events-none absolute bottom-full mb-1 hidden whitespace-nowrap rounded bg-zinc-900 px-1.5 py-0.5 text-[11px] text-white group-hover:block">
                {d.label}: {d.count}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-1 flex justify-between pr-6 text-[10px] text-zinc-500" aria-hidden>
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
      <table className="sr-only">
        <caption>Form submissions per week</caption>
        <thead><tr><th>Week starting</th><th>Submissions</th></tr></thead>
        <tbody>{data.map((d) => <tr key={d.label}><td>{d.label}</td><td>{d.count}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}
