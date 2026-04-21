/**
 * 3D-flip flashcard.
 *
 * The wrapper owns the CSS perspective so transforms happen in depth. The
 * inner ``.flip-inner`` rotates 180° around Y when ``flipped`` is true, and
 * the front/back faces use ``backface-visibility: hidden`` so only one face
 * is visible at a time.
 *
 * For *phrase* cards the front shows a smaller Korean font plus the
 * context sentence that was saved alongside it; the back keeps the same
 * translation layout as single-word cards.
 */
export default function Flashcard({ card, flipped, leaving, onShowAnswer }) {
  if (!card) return null;
  const isPhrase = !!card.is_phrase;

  return (
    <div
      className={`flip-wrap mx-auto w-full max-w-lg transition-all duration-300 ${
        leaving ? "-translate-x-10 opacity-0" : "translate-x-0 opacity-100"
      }`}
    >
      <div className={`flip-inner ${flipped ? "is-flipped" : ""}`}>
        {/* ------------------------------------------------------- FRONT */}
        <div className="flip-face card flex min-h-[320px] flex-col items-center justify-between p-8 md:min-h-[380px] md:p-10">
          <span
            className={`text-xs uppercase tracking-widest ${
              isPhrase
                ? "rounded-full bg-purple-100 px-2 py-0.5 text-purple-700"
                : "text-muted"
            }`}
          >
            {isPhrase ? "Phrase" : "Question"}
          </span>

          <div className="flex flex-col items-center gap-3 text-center">
            <span
              lang="ko"
              className={`font-ko font-bold leading-tight ${
                isPhrase
                  ? "text-[2rem] md:text-[2.25rem]"
                  : "text-[3rem] md:text-[3.25rem]"
              }`}
            >
              {card.korean_word}
            </span>
            {card.romanization && (
              <span className="text-base italic text-[#888]">
                {card.romanization}
              </span>
            )}
            {isPhrase && card.context_sentence && (
              <p
                lang="ko"
                className="font-ko max-w-md text-sm italic text-muted"
              >
                “{card.context_sentence}”
              </p>
            )}
          </div>

          <button className="btn-primary w-full md:w-auto" onClick={onShowAnswer}>
            Show Answer
          </button>
        </div>

        {/* -------------------------------------------------------- BACK */}
        <div className="flip-face flip-face-back card flex min-h-[320px] flex-col items-center justify-between p-8 md:min-h-[380px] md:p-10">
          <div className="flex w-full flex-col items-center gap-2 text-center">
            <span
              lang="ko"
              className={`font-ko font-bold text-ink ${
                isPhrase ? "text-2xl" : "text-3xl"
              }`}
            >
              {card.korean_word}
            </span>
            {card.romanization && (
              <span className="text-sm italic text-[#888]">
                {card.romanization}
              </span>
            )}
          </div>

          <div className="flex w-full flex-col items-center gap-3 text-center">
            <span className="text-[1.5rem] font-semibold leading-snug text-accent md:text-[1.625rem]">
              {card.translation}
            </span>
            {isPhrase && card.context_sentence && (
              <p
                lang="ko"
                className="font-ko max-w-md text-sm italic text-muted"
              >
                “{card.context_sentence}”
              </p>
            )}
            {!isPhrase && card.example_sentence && (
              <p
                lang="ko"
                className="font-ko max-w-md text-sm text-muted"
              >
                {card.example_sentence}
              </p>
            )}
            {card.personal_note && (
              <p className="max-w-md rounded-lg bg-paper px-3 py-2 text-xs text-ink">
                <span className="mr-2 uppercase tracking-wide text-muted">
                  Note
                </span>
                {card.personal_note}
              </p>
            )}
          </div>

          <span className="text-xs text-muted">
            Rate how well you recalled it
          </span>
        </div>
      </div>
    </div>
  );
}
