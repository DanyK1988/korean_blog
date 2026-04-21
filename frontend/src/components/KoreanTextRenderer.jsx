import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import KoreanWord from "./KoreanWord.jsx";
import PhraseSavePopover from "./PhraseSavePopover.jsx";

/**
 * Renders Korean body content with two interactive behaviours:
 *
 * 1. **Single-word save** — every Hangul token is wrapped in a
 *    :class:`KoreanWord` span; clicking one opens the per-word popover.
 * 2. **Phrase save** — selecting text with the mouse (or a long touch)
 *    opens a floating :class:`PhraseSavePopover` anchored near the
 *    selection end, pre-filled with the selected text and the sentence
 *    containing it.
 *
 * Props
 * -----
 * - ``content``     : HTML/plain string (posts may contain tags, texts
 *   generally contain ``<p>`` breaks)
 * - ``sourceType``  : ``"post"`` | ``"text"`` — sent on save
 * - ``sourceId``    : id of the Post or Text this content belongs to
 * - ``savedDict``   : ``Map<string, SavedWord>`` of already-saved words
 * - ``onSaveWord``  : callback after a single-word save
 * - ``onSavePhrase``: callback after a phrase save
 */
const KOREAN_RE = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]+/g;
const HAS_KOREAN = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/;
const ALLOWED_TAGS = new Set([
  "p", "br", "strong", "em", "u", "h1", "h2", "h3", "h4",
  "ul", "ol", "li", "blockquote",
]);

export default function KoreanTextRenderer({
  content,
  sourceType = "post",
  sourceId,
  savedDict,
  onSaveWord,
  onSavePhrase,
}) {
  const [phraseSel, setPhraseSel] = useState(null);
  const containerRef = useRef(null);

  const nodes = useMemo(() => parse(content || ""), [content]);
  const plainText = useMemo(() => stripTags(content || ""), [content]);

  function handleSelection() {
    // Defer one tick so the selection has settled after mouseup.
    setTimeout(() => {
      const sel = window.getSelection?.();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
      const raw = sel.toString();
      const text = raw.trim();
      if (!text || !HAS_KOREAN.test(text)) return;

      const range = sel.getRangeAt(0);
      // Only react if the selection started inside our container.
      const container = containerRef.current;
      if (!container || !container.contains(range.commonAncestorContainer)) {
        return;
      }

      const rect = range.getBoundingClientRect();
      const context = extractContextSentence(plainText, text);
      setPhraseSel({
        text,
        context,
        position: {
          x: rect.left + rect.width / 2,
          y: rect.bottom,
        },
      });
    }, 0);
  }

  function closePhrase() {
    setPhraseSel(null);
    window.getSelection?.()?.removeAllRanges?.();
  }

  function handlePhraseSaved(saved) {
    onSavePhrase?.(saved);
  }

  return (
    <>
      <div
        ref={containerRef}
        onMouseUp={handleSelection}
        onTouchEnd={handleSelection}
        lang="ko"
        className="prose prose-sm max-w-none space-y-4 text-ink selection:bg-accent-soft selection:text-accent-dark"
      >
        {renderNodes(nodes, { sourceType, sourceId, savedDict, onSaveWord })}
      </div>

      {phraseSel && (
        <PhraseSavePopover
          phrase={phraseSel.text}
          contextSentence={phraseSel.context}
          position={phraseSel.position}
          sourceType={sourceType}
          sourceId={sourceId}
          onSave={handlePhraseSaved}
          onClose={closePhrase}
        />
      )}
    </>
  );
}

// ===========================================================================
// HTML micro-parser (shared with the previous PostBody implementation).
// ===========================================================================

function parse(input) {
  const tokens = tokenize(input);
  let i = 0;

  function walk(stopTag = null) {
    const out = [];
    while (i < tokens.length) {
      const t = tokens[i];
      if (t.type === "close") {
        if (t.tag === stopTag) {
          i += 1;
          return out;
        }
        i += 1;
        continue;
      }
      if (t.type === "open") {
        const tag = t.tag;
        i += 1;
        if (!ALLOWED_TAGS.has(tag)) {
          out.push(...walk(tag));
          continue;
        }
        if (tag === "br") {
          out.push({ kind: "br" });
          continue;
        }
        const children = walk(tag);
        out.push({ kind: "tag", tag, children });
        continue;
      }
      if (t.type === "text") {
        out.push({ kind: "text", text: t.text });
        i += 1;
        continue;
      }
      i += 1;
    }
    return out;
  }

  return walk();
}

function tokenize(input) {
  const tokens = [];
  let idx = 0;
  while (idx < input.length) {
    if (input[idx] === "<") {
      const end = input.indexOf(">", idx);
      if (end === -1) {
        tokens.push({ type: "text", text: input.slice(idx) });
        break;
      }
      const raw = input.slice(idx + 1, end).trim();
      idx = end + 1;
      if (!raw) continue;
      if (raw.startsWith("/")) {
        tokens.push({ type: "close", tag: raw.slice(1).toLowerCase() });
      } else {
        const tag = raw.split(/[\s/]/)[0].toLowerCase();
        tokens.push({ type: "open", tag });
        if (raw.endsWith("/")) tokens.push({ type: "close", tag });
      }
    } else {
      const next = input.indexOf("<", idx);
      const text = input.slice(idx, next === -1 ? input.length : next);
      if (text) tokens.push({ type: "text", text: decodeEntities(text) });
      idx = next === -1 ? input.length : next;
    }
  }
  return tokens;
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripTags(html) {
  return decodeEntities(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function renderNodes(nodes, ctx) {
  return nodes.map((node, idx) => renderNode(node, idx, ctx));
}

function renderNode(node, idx, ctx) {
  if (node.kind === "br") return <br key={idx} />;
  if (node.kind === "text")
    return <Fragment key={idx}>{splitKorean(node.text, ctx, idx)}</Fragment>;
  if (node.kind === "tag") {
    const Tag = node.tag;
    return <Tag key={idx}>{renderNodes(node.children, ctx)}</Tag>;
  }
  return null;
}

function splitKorean(text, ctx, keyBase) {
  const parts = [];
  let lastIndex = 0;
  let match;
  let n = 0;
  KOREAN_RE.lastIndex = 0;
  while ((match = KOREAN_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <Fragment key={`${keyBase}-t-${n}`}>
          {text.slice(lastIndex, match.index)}
        </Fragment>
      );
    }
    parts.push(
      <KoreanWord
        key={`${keyBase}-k-${n}`}
        word={match[0]}
        sourceType={ctx.sourceType}
        sourceId={ctx.sourceId}
        savedDict={ctx.savedDict}
        onSaved={ctx.onSaveWord}
      />
    );
    lastIndex = match.index + match[0].length;
    n += 1;
  }
  if (lastIndex < text.length) {
    parts.push(
      <Fragment key={`${keyBase}-t-end`}>{text.slice(lastIndex)}</Fragment>
    );
  }
  return parts;
}

// ===========================================================================
// Context-sentence extraction
// ===========================================================================

const SENTENCE_TERMINATORS = /[.!?。！？]/;

/**
 * Find the sentence in ``plainText`` that contains ``selection``.
 *
 * We walk outwards from the first occurrence of ``selection`` in the
 * plain-text corpus to the nearest sentence terminators on either side.
 * This produces a robust result even when the selection spans multiple
 * paragraphs (we stop at the first terminator outside the selection).
 */
export function extractContextSentence(plainText, selection) {
  if (!plainText || !selection) return selection || "";
  const idx = plainText.indexOf(selection);
  if (idx === -1) return selection;

  let start = idx;
  while (start > 0 && !SENTENCE_TERMINATORS.test(plainText[start - 1])) {
    start -= 1;
  }
  let end = idx + selection.length;
  while (end < plainText.length && !SENTENCE_TERMINATORS.test(plainText[end])) {
    end += 1;
  }
  // Include the terminator character itself for a natural-looking sentence.
  if (end < plainText.length) end += 1;

  return plainText.slice(start, end).trim();
}
