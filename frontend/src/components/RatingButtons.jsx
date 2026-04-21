/**
 * Again / Hard / Good / Easy rating row.
 *
 * ``previews`` is the ``{ [quality]: intervalDays }`` map returned by the
 * backend (or computed client-side on the first turn) so each button can
 * show the next review time the SM-2 algorithm would schedule.
 */
const BUTTONS = [
  {
    quality: 1,
    label: "Again",
    classes: "bg-red-100 text-red-700 hover:bg-red-200",
    hint: "< 1 min",
    forceHint: true,
  },
  {
    quality: 2,
    label: "Hard",
    classes: "bg-orange-100 text-orange-700 hover:bg-orange-200",
    hint: "10 min",
    forceHint: true,
  },
  {
    quality: 4,
    label: "Good",
    classes: "bg-teal-100 text-teal-700 hover:bg-teal-200",
  },
  {
    quality: 5,
    label: "Easy",
    classes: "bg-green-100 text-green-700 hover:bg-green-200",
  },
];

function formatInterval(days) {
  if (days == null) return "";
  if (days < 1) return "< 1 day";
  if (days === 1) return "1 day";
  if (days < 30) return `${days} days`;
  const months = Math.round(days / 30);
  return months === 1 ? "1 month" : `${months} months`;
}

export default function RatingButtons({ previews, disabled, onRate }) {
  return (
    <div className="mt-6 grid w-full max-w-lg grid-cols-2 gap-2 md:grid-cols-4">
      {BUTTONS.map((btn) => {
        const hint = btn.forceHint
          ? btn.hint
          : formatInterval(previews?.[btn.quality]);
        return (
          <button
            key={btn.quality}
            disabled={disabled}
            onClick={() => onRate(btn.quality)}
            className={`${btn.classes} group flex flex-col items-center gap-0.5 rounded-full px-4 py-3 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 enabled:hover:-translate-y-0.5 enabled:hover:scale-[1.02]`}
          >
            <span>{btn.label}</span>
            <span className="text-[11px] font-medium opacity-70">{hint}</span>
          </button>
        );
      })}
    </div>
  );
}
