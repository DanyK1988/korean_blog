/**
 * Progress bar + Anki-style counters shown above the flashcard.
 */
export default function StudyProgress({ current, total, counts }) {
  const pct = total === 0 ? 0 : Math.min(100, Math.round((current / total) * 100));

  return (
    <div className="mx-auto mb-6 w-full max-w-lg">
      <div className="mb-2 flex items-center justify-between text-xs text-muted">
        <span>
          Card <strong className="text-ink">{Math.min(current + 1, total)}</strong>{" "}
          of <strong className="text-ink">{total}</strong>
        </span>
        <div className="flex items-center gap-3">
          <Counter dotClass="bg-red-500" label="again" value={counts.again} />
          <Counter dotClass="bg-orange-400" label="learning" value={counts.hard} />
          <Counter dotClass="bg-green-500" label="done" value={counts.good} />
        </div>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-accent transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Counter({ dotClass, label, value }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-block h-2 w-2 rounded-full ${dotClass}`} />
      <span className="font-medium text-ink">{value}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
